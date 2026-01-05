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

import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "../buildGrids/uiSubmenu.js";
import {
  delOneKeyFromDbStore,
  getIndex,
} from "../database/idbSetGetValues.mjs";
import { sleep } from "../uiHelper.js";

export { dbsWithContent, uiWrapper };

const parser = new DOMParser(); // sanitize html (placebo), else mozilla linter cries

/**
 * Use Download icon to show div.
 * Each IDB store has options.
 * (A) All files automated sequential.
 * (B) Zip all blobs and dl one compressed file.
 */
async function uiWrapper() {
  const parentId = "fixedPositionAnchor";
  document.getElementById(parentId).style.height = "100%";

  await createFeatureDivOutline({
    parentId: parentId,
    childId: "fileDbOuter",
  });

  const head = await createFeatureDivSection({
    parentId: "fileDbOuter",
    childId: "fileDbHead",
  });
  await fileDbHead(head);

  const hint = await createFeatureDivSection({
    parentId: "fileDbOuter",
    childId: "fileDbHint",
  });
  await fileDbHint(hint);

  const dlDiv = await createFeatureDivSection({
    parentId: "fileDbOuter",
    childId: "showDownloads",
  });
  dlDiv.style.overflow = "auto";
  await showDownloads(dlDiv);

  return;
}

function fileDbHead(divHead) {
  return new Promise((resolve, _) => {
    divHead.style.backgroundColor = "#fc4a1a";
    divHead.style.border = "none";

    const divHeadTxt = document.createElement("div");
    const divInfo = document.createElement("div");
    divInfo.classList.add("infoColor");
    divHead.appendChild(divHeadTxt);
    divHead.appendChild(divInfo);

    divHeadTxt.innerText = "";
    resolve();
  });
}

function fileDbHint(divHint) {
  return new Promise((resolve, _) => {
    const info = document.createElement("div");
    info.innerText =
      "Downloads. Use an external App to decompress ZIP(ed) downloads.";
    divHint.appendChild(info);
    resolve();
  });
}

/**
 * Only objectStores with recorded blobs.
 * @param {HTMLDivElement} anchor div
 * @returns {Promise<undefined>}
 */
async function showDownloads(anchor) {
  const blobStore = "content_blobs";
  const haveContent = await dbsWithContent(blobStore);
  for (const db of haveContent) {
    const { wrap, info, size } = await storeInfoDivs(db.id, db.name, anchor);
    await showTotalStorage(db.id, size);
    await showPC({ dbID: db.id, wrap: wrap, info: info });
    await showZIP({ dbID: db.id, dbName: db.name, wrap: wrap, info: info });
  }
  return;
}

function storeInfoDivs(dbID, dbName, dlSection) {
  return new Promise((resolve, _) => {
    const wrapper = document.createElement("div"); // wrap to del store from dl list
    wrapper.id = "divStore_" + dbID;
    wrapper.style.padding = "10px";

    const divStoreInfo = document.createElement("div");
    divStoreInfo.id = "divStoreInfo_" + dbID;
    const divStoreName = document.createElement("div");
    divStoreName.id = "divStoreName_" + dbID;

    dlSection.appendChild(wrapper);
    wrapper.appendChild(divStoreInfo);
    divStoreInfo.appendChild(divStoreName);

    const spanStoreName = document.createElement("span");
    spanStoreName.style.color = "#033e58";
    spanStoreName.style.fontSize = "120%";
    spanStoreName.innerText = dbName; // str name of station store
    spanStoreName.style.paddingLeft = "10px";
    spanStoreName.style.paddingRight = "10px";
    spanStoreName.style.paddingBottom = "4px";

    const spanCopyImg = document.createElement("span");
    const spanDelImg = document.createElement("span");
    const spanStoreSize = document.createElement("span");
    spanStoreSize.style.display = "block"; // push below copy
    spanStoreSize.style.paddingTop = "6px";
    spanStoreSize.style.paddingLeft = "10px";
    spanStoreSize.style.paddingBottom = "10px";
    spanStoreSize.style.color = "#033e58";
    spanStoreSize.style.fontSize = "125%";

    divStoreName.appendChild(spanDelImg);
    divStoreName.appendChild(spanStoreName);
    divStoreName.appendChild(spanCopyImg);
    divStoreName.appendChild(spanStoreSize);

    // Click copies store name.
    const imgCpName = document.createElement("img");
    imgCpName.classList.add("handCursor");
    imgCpName.src = "./images/copy-icon-dark.svg";
    imgCpName.style.height = "22px";
    spanCopyImg.appendChild(imgCpName);

    imgCpName.addEventListener("click", async () => {
      navigator.clipboard.writeText(dbName);
      imgCpName.src = "./images/copy-done-name-icon.svg";
      await sleep(1000);
      imgCpName.src = "./images/copy-icon-dark.svg";
    });

    // Delete store content on demand.
    const imgDel = document.createElement("img");
    imgDel.classList.add("handCursor");
    imgDel.src = "./images/delete-store-icon.svg";
    imgDel.style.height = "22px";
    spanDelImg.appendChild(imgDel);

    imgDel.addEventListener("click", async () => {
      const blobs = await getIndex({
        dbName: dbID,
        store: "content_blobs",
      });
      await cleanupStore(dbID, blobs, divStoreInfo); // del blobs
      // No await for whatever reason!
      uiDelStation(wrapper);
    });

    resolve({
      wrap: wrapper,
      info: divStoreInfo,
      size: spanStoreSize,
    });
  });
}

/**
 * Find candidates either for Blacklist array dump or recorded blobs.
 * Station DB has the "stationuuid" of the station JSON object.
 * Each DB has two objectStores: 'blacklist_name' & 'content_blobs'
 * @param {string} objectStore name 'blacklist_name' | 'content_blobs'
 * @returns {Promise<Array<{id: string, name: string}>>} array of IDB stores in use [{id: uuid, name: blacklist_name}, {}]
 */
async function dbsWithContent(objectStore) {
  const dbs = await getIndex({
    dbName: "app_db",
    // Filter store. Select * From <ever been used stations> alike.
    store: "uuid_name_dl",
  }).catch((e) => {
    console.error("dbsWithContent->app_db", e);
  });

  const hasContent = [];
  for (const db of dbs) {
    const dictArray = await getIndex({
      dbName: db.id,
      store: objectStore,
    }).catch((e) => {
      console.error("dbsWithContent->db", e);
    });
    if (dictArray.length > 0) hasContent.push(db);
  }
  return hasContent;
}

/**
 * @param {string} dbId stationuuid
 * @param {HTMLSpanElement} spanStoreSize spanElement
 * @returns {Promise<undefined>}
 */
async function showTotalStorage(dbId, spanStoreSize) {
  const storeArray = await getIndex({
    dbName: dbId,
    store: "content_blobs",
  });
  // Reduce exercise.
  const sum = storeArray.reduce((accu, blob) => {
    const addSize = accu + blob.size;
    return addSize;
  }, 0);
  const kB = sum / 1024;
  const mB = kB / 1024;
  const gB = mB / 1204;
  let show = kB.toFixed(2) + " kB";
  if (gB.toFixed(1) < 1) show = mB.toFixed(2) + " MB";
  if (gB.toFixed(1) > 1) show = gB.toFixed(2) + " GB";
  if (mB.toFixed(1) < 1) show = kB.toFixed(2) + " kB";
  spanStoreSize.innerText = "files: " + storeArray.length + " size: " + show;
  return;
}
/**
 * Android OS may use it.
 * Download blobs and remove them and "store section" from store.
 * @type {Object} dict
 * @param {string} dbID string
 * @param {string} dbName string
 * @param {HTMLDivElement} wrap HTMLDivElement
 * @param {HTMLDivElement} info HTMLDivElement
 * @returns {Promise<undefined>}
 */
function showZIP({ dbID, dbName, wrap, info }) {
  return new Promise((resolve, _) => {
    const divClick = document.createElement("div");
    divClick.id = "divInfoZIP_" + dbID;
    wrap.appendChild(divClick);

    const txt = document.createElement("span");
    txt.innerText = "ZIP container.";

    const img = document.createElement("img");
    img.classList.add("handCursor");
    img.src = "./images/download-icon.svg";
    img.style.height = "26px";
    img.style.paddingLeft = "10px";
    img.style.paddingRight = "10px";

    info.appendChild(divClick);
    divClick.appendChild(img);
    divClick.appendChild(txt);

    divClick.addEventListener("click", async () => {
      const blobs = await getIndex({
        dbName: dbID,
        store: "content_blobs",
      });

      await downloadZIP(dbName, blobs, info);
      await cleanupStore(dbID, blobs, info); // del blobs
      // No await for whatever reason!
      uiDelStation(wrap);
      /*         
        -- No space on disk, 4GB free for 2GB blobs, 32GB RAM, test with docker and fix
        jszip.js:2960 Uncaught (in promise) RangeError: Array buffer allocation failed
        at new ArrayBuffer (<anonymous>)
        at new Uint8Array (<anonymous>)
        at concat (jszip.js:2960:23)
        at StreamHelper.<anonymous> (jszip.js:3003:23)
        at jszip.js:3948:24
        at run (jszip.js:12727:21)
        at runIfPresent (jszip.js:12756:23)
        at onGlobalMessage (jszip.js:12800:21) */
    });

    resolve();
  });
}

/**
 * PC User ONLY.
 * Download blobs and remove them and "store section" from store.
 * @type {Object} dict
 * @param {string} dbID string
 * @param {HTMLDivElement} wrap HTMLDivElement
 * @param {HTMLDivElement} info HTMLDivElement
 * @returns {Promise<undefined>}
 */
function showPC({ dbID, wrap, info }) {
  return new Promise((resolve, _) => {
    const divClick = document.createElement("div");
    divClick.id = "divInfoPC_" + dbID;
    wrap.appendChild(divClick);

    const txt = document.createElement("span");
    txt.innerText = "ONLY for Linux, Windows single files. No mobile OS.";

    const img = document.createElement("img");
    img.classList.add("handCursor");
    img.src = "./images/download-icon.svg";
    img.style.height = "26px";
    img.style.paddingLeft = "10px";
    img.style.paddingRight = "10px";

    info.appendChild(divClick);
    divClick.appendChild(img);
    divClick.appendChild(txt);

    divClick.addEventListener("click", async () => {
      const blobs = await getIndex({
        dbName: dbID,
        store: "content_blobs",
      });

      const dlArrayObj = await populateDlArray(blobs);
      await downloadFiles(dlArrayObj, info); // click each blob + status
      await cleanupStore(dbID, dlArrayObj, info); // del blobs
      // No await for whatever reason!
      uiDelStation(wrap); // del whole store section from document
    });

    resolve();
  });
}

/**
 * Create an anchor element to click initiate a download to /download folder.
 * An object holds anchor, the GC remover for the blob ref and DB store id of
 * the blob (title name).
 * { id: title of blob,
 *  remove: fun to remove the objectURL + blob from store
 *  anchor: DOM a element, click triggers DJ} => "dlArrayObj"
 * @param {Array<Blob>} blobs array of blobs in dicts
 * @returns {Promise<Array<{id:string,anchor:HTMLAnchorElement ,remove:Function}>>}
 * @example
 * const blobDict = {
 *   blob: Blob {size: 6579911, type: 'audio/mpeg'},
 *   // file name to store the blob on disk
 *   id: "Geoglyph - Crossing By Night [128kb Hirschmilch Chillout].mp3"
 *   size: 6579911
 *   // title to show if UI has display
 *   title: "Geoglyph - Crossing By Night"
 *   type: "audio/mpeg"
 * }
 * populateDlArray(blobDict)
 */
function populateDlArray(blobs) {
  return new Promise((resolve, _) => {
    const dlArrayObj = blobs.reduce((accu, blobDict) => {
      if (accu === undefined) accu = [];
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blobDict.blob);
      anchor.download = blobDict.id;
      anchor.style.display = "none"; // none
      anchor.innerText = blobDict.id;

      const entry = {
        id: blobDict.id, // for removal from store
        anchor: anchor, // auto clicker
        remove: () => URL.revokeObjectURL(anchor.href),
      };
      accu.push(entry);
      return accu;
    }, []);

    resolve(dlArrayObj);
  });
}

async function downloadZIP(dbName, blobs, info) {
  const statusBar = document.createElement("div");
  statusBar.id = "loaderZip";
  statusBar.style.minHeight = "5em";
  statusBar.style.width = "100%";
  info.appendChild(statusBar);
  const loader = document.createElement("span");
  loader.id = "loader";
  loader.classList.add("loader");
  statusBar.appendChild(loader);

  const zip = new JSZip();
  for await (const blob of blobs) {
    zip.file(blob.id, blob.blob);
  }
  await zip
    .generateAsync({ type: "blob", compression: "STORE" }) // STORE no comp
    .then(function (content) {
      const anchorElement = document.createElement("a");
      anchorElement.href = URL.createObjectURL(content);
      anchorElement.download = dbName;
      anchorElement.style.display = "none";
      document.body.appendChild(anchorElement);
      anchorElement.click();
      anchorElement.remove();

      statusBar.style.display = "none";
    });
}

/**
 * Trigger the download anchor element with a delay to prevent
 * browser to be overwhelemed.
 * @param {*} dlArrayObj
 * @param {*} divStoreInfo
 * @returns
 */
async function downloadFiles(dlArrayObj, divStoreInfo) {
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

  //browser.downloads.onChanged.addListener(downloadsHandleChanged); // works like MDN sample
  for await (const [index, blob] of dlArrayObj.entries()) {
    await sleep(100); // comment out if done
    blob.anchor.click();
    // await downloadsHandleChanged(); // Dl "complete" must trigger next dl.

    statusBar.style.width = ((index + 1) / blobCount) * 100 + "%";
  }
}

/**
 * Delete all blobs from a stations "content_blobs" store.
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
 * @param {HTMLDivElement} wrapper div
 * @returns {Promise<undefined>}
 */
async function uiDelStation(wrapper) {
  await sleep(1000); // keep showing status bar delayed
  wrapper.remove();
  return;
}
