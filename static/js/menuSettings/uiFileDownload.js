// uiFileDownload.js
"use strict";
/**
 *  This file is part of station-recorder. station-recorder is hereby called the app.
 *  The app is published to be a distributed database for public radio and
 *  TV station URLs. The cached DB copy can be used also if
 *  the public database fails. Additional features shall improve the
 *  value of the application. Example is the vote, click statistic feature.
 *  Copyright (C) 2025 René Horn
 *
 *    The app is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    any later version.
 *
 *    The app is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License
 *    along with the app. If not, see <http://www.gnu.org/licenses/>.
 */

import { sleep } from "../uiHelper.js";
import { getIndex, delOneKeyFromDbStore } from "../database/idbSetGetValues.js";
import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "../buildGrids/uiSubmenu.js";

export { showFileDbUi, filledStationStoresGet };

const parser = new DOMParser(); // sanitize html, else mozilla linter cries

function showFileDbUi() {
  return new Promise(async (resolve, _) => {
    const parentId = "fixedPositionAnchor";
    const fileDbOuter = await createdbUpdUiOuter({
      parentId: parentId,
      childId: "fileDbOuter",
    });

    // remove X that hide the div
    fileDbOuter.removeChild(fileDbOuter.firstElementChild);
    document.getElementById("fixedPositionAnchor").style.height = "100%";
    // X must remove div
    const spanClose = document.createElement("span");
    spanClose.id = "fileDbClose";
    spanClose.classList.add("handCursor");
    spanClose.innerText = "✖";
    spanClose.style.textAlign = "right";
    spanClose.style.paddingRight = "14px";
    spanClose.style.display = "inline-block";
    spanClose.style.width = "100%";
    spanClose.style.backgroundColor = "#fc4a1a";
    spanClose.addEventListener("click", () => {
      fileDbOuter.remove();
    });
    fileDbOuter.appendChild(spanClose);
    // caller enable
    spanClose.style.display = "block";

    const head = await createFeatureDivSection({
      parentId: "fileDbOuter",
      childId: "fileDbHead",
    });
    fileDbHead(head);

    const hint = await createFeatureDivSection({
      parentId: "fileDbOuter",
      childId: "fileDbHint",
    });
    fileDbHint(hint);

    const infoBlock = await createFeatureDivSection({
      parentId: "fileDbOuter",
      childId: "fileDbInfoBlock",
    });
    infoBlock.style.overflow = "auto";
    fileDbInfoBlock(infoBlock);

    resolve();
  });
}

function createdbUpdUiOuter(o = {}) {
  return new Promise(async (resolve, _) => {
    try {
      document.getElementById(o.childId).remove();
    } catch (e) {}
    const divOutline = await createFeatureDivOutline({
      parentId: o.parentId,
      divOutline: o.childId,
    });
    divOutline.classList.add("column500");
    divOutline.style.width = "500px";
    divOutline.style.display = "block";
    resolve(divOutline);
  });
}

function fileDbHead(divHead) {
  const divHeadTxt = document.createElement("div");
  const divInfo = document.createElement("div");
  divInfo.classList.add("infoColor");
  divHead.appendChild(divHeadTxt);
  divHead.appendChild(divInfo);

  divHeadTxt.innerText =
    "Save your browser's cache database (DB) to '/download' folder.";

  const hintHtml =
    "<br>A 'no space left' condition (disk full) will damage the app. " +
    "Reinstall the app! Consider to save blacklists from time to time." +
    "<br>Blacklist dumps also save Favorites and Custom URLs.";
  const details =
    "<details><summary><code>Warning</code></summary>" +
    hintHtml +
    "</details>";
  const parsed = parser.parseFromString(details, "text/html");
  const tags = parsed.getElementsByTagName("body");
  for (const tag of tags) {
    divInfo.appendChild(tag);
  }
}
function fileDbHint(divHint) {
  const divHeadTxt = document.createElement("div");
  const divInfo = document.createElement("div");
  divInfo.classList.add("infoColor");
  divHint.appendChild(divHeadTxt);
  divHint.appendChild(divInfo);

  divHeadTxt.innerText = "The list of data stores with file content.";

  const hintHtml =
    "<br>'PC' user (linux, win) can dump the whole station store. " +
    "<br><br>The browser extension is running on FireFox for Android. " +
    "<br>'Android' user 'MUST' (omg) dump a single file." +
    "<br>Browser skips all files, except first one, at multi-download.";
  const details =
    "<details><summary><code>details</code></summary>" +
    hintHtml +
    "</details>";
  const parsed = parser.parseFromString(details, "text/html");
  const tags = parsed.getElementsByTagName("body");
  for (const tag of tags) {
    divInfo.appendChild(tag);
  }
}

/**
 * Download store lists stuff starts here.
 * Store names array loop.
 * Each store name gets a ^^section^^ of divs.
 * storeEntry() builds the whole section.
 * Wrapper of section is 'divStore'.
 * @param {*} divInfoBlock
 * @returns
 */
function fileDbInfoBlock(divInfoBlock) {
  return new Promise(async (resolve, _) => {
    const objectStore = "content_blobs";
    const filledDbArray = await filledStationStoresGet(objectStore);

    for (const db of filledDbArray) {
      // Write only the name of the store and copy name icon to page.
      const ele = await storeEntry(db.name, divInfoBlock);
      // Write info about total amount of bytes in store under the name.
      storeCalcTotalStorage(db.id, ele.spanStoreSize);

      // Listener PC downloads all blobs and removes store section from page.
      pcSetEvtListenerPC({
        dbId: db.id, // to del blobs
        dbName: db.name,
        listener: ele.divInfoPC, // dl icon plus text clickable
        divStoreWrap: ele.divStoreWrap,
        divStoreInfo: ele.divStoreInfo,
      });
      // Android, like PC, but opens a list with blobs and dl icons.
      androidSetEvtListener({
        dbId: db.id,
        dbName: db.name,
        listener: ele.divInfoAndroid,
        divInfoPC: ele.divInfoPC,
        divInfoAndroid: ele.divInfoAndroid,
        divStoreInfo: ele.divStoreInfo,
        divStoreWrap: ele.divStoreWrap,
        divStoreInfo: ele.divStoreInfo,
      });
    }

    resolve();
  });
}

/**
 * Station DB scanned for stores with content.
 * @param {*} objectStore 'blacklist_name' or 'content_blobs'
 * @returns {Promise Array} array of DBs filled [{id: uuid, name: foo}, {}]
 */
function filledStationStoresGet(objectStore) {
  return new Promise(async (resolve, _) => {
    const filledDbArray = [];
    const stationArray = await getIndex({
      dbName: "app_db",
      store: "uuid_name_dl",
    }).catch((e) => {
      console.error("filledStationStoresGet->app_db", e);
    });

    // Array with blop references and descriptions.
    for (const db of stationArray) {
      const dictArray = await getIndex({
        dbName: db.id,
        store: objectStore,
      }).catch((e) => {
        console.error("filledStationStoresGet->db", e);
      });
      if (dictArray.length > 0) {
        filledDbArray.push(db);
      }
    }
    resolve(filledDbArray);
  });
}

/**
 * Store list entry with dl icon, store name for Android.
 * Easy dl for Linux, Win with dl all icon.
 */
function storeEntry(storeName, divInfoBlock) {
  return new Promise((resolve, _) => {
    const divStoreWrap = document.createElement("div"); // wrap to del store from dl list
    const divStoreInfo = document.createElement("div");
    const divStoreInfoTxt = document.createElement("div");
    const divInfoPC = document.createElement("div");
    const divInfoAndroid = document.createElement("div");
    const divAndroidList = document.createElement("div");
    divAndroidList.innerText = ""; // to add info
    divStoreWrap.id = "divStore_" + storeName;
    divStoreInfo.id = "divStoreInfo_" + storeName;
    divStoreInfoTxt.id = "divStoreInfoTxt_" + storeName;
    divInfoPC.id = "divInfoPC_" + storeName;
    divInfoAndroid.id = "divInfoAndroid_" + storeName;

    const spanDlImgPC = document.createElement("span");
    const spanDlTxtPC = document.createElement("span");
    spanDlTxtPC.innerText = "Linux, Windows";
    const spanDlImgAndroid = document.createElement("span");
    const spanDlTxtAndroid = document.createElement("span");
    spanDlTxtAndroid.innerText = "Android only here (individual files)";
    const spanStoreName = document.createElement("span");
    const spanCopyImg = document.createElement("span");
    const spanStoreSize = document.createElement("span");

    divInfoPC.appendChild(spanDlImgPC);
    divInfoPC.appendChild(spanDlTxtPC);
    divInfoAndroid.appendChild(spanDlImgAndroid);
    divInfoAndroid.appendChild(spanDlTxtAndroid);
    // show array of single blobs to dl one by one
    divInfoAndroid.appendChild(divAndroidList);

    divStoreInfoTxt.appendChild(spanStoreName);
    divStoreInfoTxt.appendChild(spanCopyImg);
    divStoreInfoTxt.appendChild(spanStoreSize);

    divStoreInfo.appendChild(divStoreInfoTxt);
    divStoreInfo.appendChild(divInfoPC);
    divStoreInfo.appendChild(divInfoAndroid);

    divStoreWrap.appendChild(divStoreInfo);
    divInfoBlock.appendChild(divStoreWrap);

    divStoreWrap.style.padding = "10px";
    spanDlImgPC.style.paddingLeft = "10px";
    spanDlImgAndroid.style.paddingLeft = "10px";
    spanStoreSize.style.display = "block"; // push below
    spanStoreName.style.color = "blue";
    spanStoreName.style.fontSize = "120%";
    spanStoreName.innerText = storeName; // str name of station store
    spanStoreName.style.paddingLeft = "10px";
    spanStoreName.style.paddingRight = "10px";
    spanStoreName.style.paddingBottom = "4px";

    spanStoreSize.style.paddingTop = "6px";
    spanStoreSize.style.paddingLeft = "10px";
    spanStoreSize.style.paddingBottom = "10px";
    spanStoreSize.style.color = "white";

    // clicker download icons PC and Android, root.
    const imgDlPC = document.createElement("img");
    imgDlPC.classList.add("handCursor");
    imgDlPC.src = "./images/download-icon.svg";
    imgDlPC.style.height = "26px";
    spanDlImgPC.appendChild(imgDlPC);
    const imgDlAndroid = document.createElement("img");
    imgDlAndroid.classList.add("handCursor");
    imgDlAndroid.src = "./images/download-icon.svg";
    imgDlAndroid.style.height = "26px";
    spanDlImgAndroid.appendChild(imgDlAndroid);

    // click listener copy store name
    const imgCopyName = document.createElement("img");
    imgCopyName.classList.add("handCursor");
    imgCopyName.src = "./images/copy-icon-dark.svg";
    imgCopyName.style.height = "30px";
    spanCopyImg.appendChild(imgCopyName);

    imgCopyName.addEventListener("click", async () => {
      navigator.clipboard.writeText(storeName);
      imgCopyName.src = "./images/copy-done-name-icon.svg";
      await sleep(1000);
      imgCopyName.src = "./images/copy-icon-dark.svg";
    });

    const eleObj = {
      divStoreWrap: divStoreWrap,
      divStoreInfo: divStoreInfo,
      spanStoreSize: spanStoreSize,
      spanDlImgPC: spanDlImgPC, // clicker, set listener
      spanDlImgAndroid: spanDlImgAndroid,
      divInfoPC: divInfoPC,
      divInfoAndroid: divInfoAndroid,
    };
    resolve(eleObj);
  });
}

async function storeCalcTotalStorage(dbId, spanStoreSize) {
  const blobArray = await getIndex({
    dbName: dbId,
    store: "content_blobs",
  });
  const sum = blobArray.reduce((accu, blob) => {
    if (accu === undefined) accu = 0;
    const addSize = accu + blob.size;
    return addSize;
  }, 0);
  const kB = sum / 1024;
  const mB = kB / 1024;
  const gB = mB / 1204;
  spanStoreSize.innerText =
    "files: " + blobArray.length + " size: " + gB.toFixed(2) + " GB";
}

/**
 * PC
 * Download current blobs and remove them from store.
 */
function pcSetEvtListenerPC(o = {}) {
  o.listener.addEventListener("click", async () => {
    const blobAnchorArray = await getIndex({
      dbName: o.dbId,
      store: "content_blobs",
    });
    const dlArrayObj = await populateDlArray(blobAnchorArray); // click ready blobs
    await downloadStore(dlArrayObj, o.divStoreInfo); // click each blob + status
    await cleanupStore(o.dbId, dlArrayObj, o.divStoreInfo); // del blobs
    removeFromDl(o.divStoreWrap); // del whole store section from document
  });
}

/**
 * Android click deletes PC and Android root to show only files.
 */
function androidSetEvtListener(o = {}) {
  o.listener.addEventListener("click", async () => {
    const blobAnchorArray = await getIndex({
      dbName: o.dbId,
      store: "content_blobs",
    });
    const dlArrayObj = await populateDlArray(blobAnchorArray);
    setAndroidListener(
      dlArrayObj,
      o.dbId,
      o.divInfoPC, // del from section, else accident
      o.divInfoAndroid,
      o.divStoreInfo
    );
  });
}

// Android clicker populates list of blob w. dl icon.
function setAndroidListener(
  dlArrayObj,
  dbId,
  divInfoPC,
  divInfoAndroid,
  divStoreInfo
) {
  // Del PC dl possibility from section to prevent store access error.
  divInfoPC.remove();
  divInfoAndroid.remove();
  const divBlobs = document.createElement("div");
  divStoreInfo.appendChild(divBlobs);
  for (const blob of dlArrayObj.values()) {
    const divFile = document.createElement("div");
    const spanDlImg = document.createElement("span");
    const spanTxt = document.createElement("span");
    spanTxt.classList.add("downloadBlobTxt");
    spanTxt.innerText = blob.id;
    const imgDl = document.createElement("img");
    imgDl.classList.add("handCursor");
    imgDl.src = "./images/download-icon.svg";
    imgDl.style.height = "20px";

    spanDlImg.appendChild(imgDl);
    divBlobs.appendChild(divFile);
    divFile.appendChild(spanDlImg);
    divFile.appendChild(spanTxt);

    divFile.addEventListener("click", async () => {
      // Single file name removed from list after click.

      blob.anchor.click(); // Browser creates file and dl.
      await sleep(250); // Give browser time to cache dl.
      const objectStoreName = "content_blobs";
      delOneKeyFromDbStore(dbId, objectStoreName, blob.id);
      divFile.remove();
    });
  }
}

/**
 * Create an anchor element to click initiate a download to /download folder.
 * An object holds anchor, the GC remover for the blob ref and DB store id of
 * the blob (title name).
 * @param {*} objArray
 * @returns
 */
function populateDlArray(objArray) {
  return new Promise((resolve, _) => {
    const dlArrayObj = objArray.reduce((accu, dbFileObj) => {
      if (accu === undefined) accu = [];
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(dbFileObj.blob);
      anchor.download = dbFileObj.id;
      anchor.style.display = "none"; // none
      anchor.innerText = dbFileObj.id;
      const entry = {
        id: dbFileObj.id, // for removal from store
        anchor: anchor, // auto clicker
        remove: () => URL.revokeObjectURL(anchor.href),
      };
      accu.push(entry);
      return accu;
    }, []);

    resolve(dlArrayObj);
  });
}

/**
 * Trigger the download anchor element with a delay to prevent
 * browser to be overwhelemed.
 * @param {*} dlArrayObj
 * @param {*} divStoreInfo
 * @returns
 */
function downloadStore(dlArrayObj, divStoreInfo) {
  return new Promise(async (resolve, _) => {
    const statusBar = document.createElement("div");
    statusBar.id = "_statusBar";
    statusBar.style.backgroundColor = "#6261cb";
    statusBar.style.boxShadow = "rgb(81, 48, 69) 0px 0px 10px inset";
    statusBar.style.height = "20px";
    statusBar.style.width = "0%";
    divStoreInfo.appendChild(statusBar);

    // fun exec delayed store to /download folder
    // sequ. for loop, map fires async so sleep not working!!!
    const blobCount = dlArrayObj.length;
    for (const [index, blob] of dlArrayObj.entries()) {
      await sleep(250); // avoid browser skips dl
      blob.anchor.click();
      statusBar.style.width = ((index + 1) / blobCount) * 100 + "%";
    }
    resolve();
  });
}

/**
 * Delete all blobs from store.
 * @param {*} store
 * @param {*} dlArrayObj
 * @param {*} divStoreInfo
 * @returns
 */
function cleanupStore(dbId, dlArrayObj, divStoreInfo) {
  return new Promise(async (resolve, _) => {
    const objectStoreName = "content_blobs";
    const statusBar = document.createElement("div");
    statusBar.style.backgroundColor = "#6261cb";
    statusBar.style.boxShadow = "rgb(81, 48, 69) 0px 0px 10px inset";
    statusBar.style.height = "20px";
    statusBar.style.width = "0%";
    divStoreInfo.appendChild(statusBar);

    const blobCount = dlArrayObj.length;
    for (const [index, blob] of dlArrayObj.entries()) {
      delOneKeyFromDbStore(dbId, objectStoreName, blob.id);
      statusBar.style.width = ((index + 1) / blobCount) * 100 + "%";
    }
    resolve();
  });
}

/**
 * Remove strore entry from UI DB store list.
 */
async function removeFromDl(divStoreWrap) {
  await sleep(1000); // show status bar delay
  divStoreWrap.remove();
}
