// uiSettingsUrlsAdd.js
"use strinct";
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

/**
 * URL add to 'Custom' object store.
 */

import { urlAlive } from "../network/streamDetect.js";
import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "../buildGrids/uiSubmenu.js";
import { getIdbValue, setIdbValue } from "../database/idbSetGetValues.js";
import { metaData } from "../central.js";

export { buildUrlsAdd };

/**
 * Custom user URLs stored in the indexed DB of the browser.
 * URLs not existing in the public DB.
 * Can be URLs from station server playlists pls, m3u, m3u8 or 
 * URLs found elsewhere.
 * 
 * This module should be the entry point for adding URLs
 * to the public DB API. 
 * (A) A second module is needed to scan the
 * existing DB for station name -> URL combinations and allow/deny
 * the entry to the public DB if the entry already extists. 
 * The public DB does not own such a mechanism. There must also be 
 * a mandatory "tag" for genre/info to allow sorting.
 * 
 * (B) A Third module should be written to scan the indexed DB
 * (copy of public DB) for URLs with multiple station names.
 * Some smart people adding the same station name and URL to each and
 * every country.
 * (B1) Scan for single URL -> multiple station names.
 * (B2) Scan for multiple URLs -> same station name.
 * The output must be in JSON format to allow to open an icident on the
 * GitLab repo of the developer of the public DB.
 */

function buildUrlsAdd() {
  createUrlsAdd({ parentDiv: "urlsAdd" }); // def in HTML
}

function createUrlsAdd(o = {}) {
  return new Promise((resolve, _) => {
    const wait = async () => {
      const divOutlineChild = await createFeatureDivOutline({
        parentId: o.parentDiv,
        divOutline: "divCreateCustomOutline",
      });
      divOutlineChild.style.display = "block";

      // remove X that hide the div
      divOutlineChild.removeChild(divOutlineChild.firstElementChild);
      // X must remove div
      const spanClose = document.createElement("span");
      spanClose.classList.add("handCursor");
      spanClose.innerText = "✖";
      spanClose.style.textAlign = "right";
      spanClose.style.paddingRight = "14px";
      spanClose.style.display = "inline-block";
      spanClose.style.width = "100%";
      spanClose.style.backgroundColor = "#fc4a1a";
      spanClose.addEventListener("click", () => {
        document.getElementById("urlsAdd").style.display = "none";
      });
      divOutlineChild.appendChild(spanClose);

      await createFeatureDivSection({
        parentId: "divCreateCustomOutline",
        childId: "divCheckboxRadioBrowser",
      });
      // Connect online
      // await addCheckboxRadioBrowser({ parentId: "divCheckboxRadioBrowser" });

      await createFeatureDivSection({
        parentId: "divCreateCustomOutline",
        childId: "divInfoMessage",
      });
      await addInfoMessage({ parentId: "divInfoMessage" });

      await createFeatureDivSection({
        parentId: "divCreateCustomOutline",
        childId: "divCreateCustomInputElem",
      });
      await createInputElem({ parentId: "divCreateCustomInputElem" });

      await createFeatureDivSection({
        parentId: "divCreateCustomOutline",
        childId: "divCreateCustomSave",
      });
      await createSaveSection({ parentId: "divCreateCustomSave" });

      resolve();
    };
    wait();
  });
}

function simpleValidateNameInput(o = {}) {
  /*NO DB, online needs name check db */
  if (o.input.value.length <= 3) {
    o.msgElem.innerText = "name required";
    o.input.dataset.valid = "false";
    o.msgElem.classList.remove("spanTailSuccess");
    o.msgElem.classList.add("spanTailAlert");
    return;
  }
  o.msgElem.innerText = "looks good";
  o.input.dataset.valid = "true";
  o.msgElem.classList.remove("spanTailAlert");
  o.msgElem.classList.add("spanTailSuccess");
}

function simpleValidateUrlInput(o = {}) {
  /*NO DB, online needs Tags check db , make also list map cc to name for user */
  if (o.input.value.trim().substring(0, 4).toLowerCase() !== "http") {
    o.msgElem.innerText = "'HTTP' URL required";
    o.input.dataset.valid = "false";
    o.msgElem.classList.remove("spanTailSuccess");
    o.msgElem.classList.add("spanTailAlert");
    return;
  }
  o.msgElem.innerText = "looks good";
  o.input.dataset.valid = "true";
  o.msgElem.classList.remove("spanTailAlert");
  o.msgElem.classList.add("spanTailSuccess");
}
function simpleValidateTagsInput(o = {}) {
  /*NO DB, online needs URL check db , make also list map ccodec to name for user */
  if (o.input.value.length < 3) {
    o.msgElem.innerText = "Tag is required.";
    o.input.dataset.valid = "false";
    o.msgElem.classList.remove("spanTailSuccess");
    o.msgElem.classList.add("spanTailAlert");
    return;
  }
  o.msgElem.innerText = "looks good";
  o.input.dataset.valid = "true";
  o.msgElem.classList.remove("spanTailAlert");
  o.msgElem.classList.add("spanTailSuccess");
}
/**
 * Input boxes div wraped and spans for messages.
 */
function createInputElem(o = {}) {
  return new Promise((resolve, _) => {
    const markerUrl = 'url("./images/exclamation_mark.svg")';
    const markerSize = "16px 16px";
    const markerPos = "330px 4px"; // "center right"
    const inputSize = 45;
    const inputHeight = 30;
    const nonRequiredCol = "#383d3f";
    const placeHolderName = "Example: Cool Radio Station";
    const placeHolderUrl = "Example: https//stream.example.com/test.mp3";
    const placeHolderHome = "Example: https//example.com";
    const placeHolderFav = "Example: https//example.com/Favicon.png";
    const placeHolderCountry = "Example: germany";
    const placeHolderFed = "Example: Bavaria";
    const placeHolderLang = "Example: english";
    const placeHolderTag = "Example: jazz, smooth jazz";
    const inputBottomMargin = "8px";

    // parent div and section wrapper
    const parent = document.getElementById(o.parentId);
    const divWrapInputs = document.createElement("div");
    divWrapInputs.style.margin = "16px";
    divWrapInputs.style.padding = "10px 16px";
    divWrapInputs.style.borderRadius = "4px";
  
    /* Name */
    const inputName = document.createElement("input");
    inputName.type = "text";
    inputName.style.backgroundImage = markerUrl;
    inputName.style.backgroundSize = markerSize;
    inputName.style.backgroundPosition = markerPos;
    inputName.style.height = inputHeight + "px";
    inputName.size = inputSize.toString();
    inputName.placeholder = placeHolderName;
    inputName.dataset.valid = false;
    const divInputName = document.createElement("div");
    divInputName.style.marginBottom = inputBottomMargin;
    const spanInputNameHead = document.createElement("span");
    spanInputNameHead.classList.add("spanHead");
    spanInputNameHead.innerText = "Name";
    const spanInputNameTail = document.createElement("span");
    spanInputNameTail.classList.add("spanTail");
    spanInputNameTail.classList.add("spanTailAlert");
    spanInputNameTail.innerText = "You have to name the stream.";
    divWrapInputs.appendChild(divInputName);
    divInputName.appendChild(spanInputNameHead);
    divInputName.appendChild(inputName);
    divInputName.appendChild(spanInputNameTail);
    inputName.addEventListener("click", () => {
      simpleValidateNameInput({ input: inputName, msgElem: spanInputNameTail });
    });
    inputName.addEventListener("input", () => {
      simpleValidateNameInput({ input: inputName, msgElem: spanInputNameTail });
    });
    /* URL */
    const inputUrl = document.createElement("input");
    inputUrl.type = "text";
    inputUrl.style.backgroundImage = markerUrl;
    inputUrl.style.backgroundSize = markerSize;
    inputUrl.style.backgroundPosition = markerPos;
    inputUrl.style.height = inputHeight + "px";
    inputUrl.size = inputSize.toString();
    inputUrl.placeholder = placeHolderUrl;
    inputUrl.dataset.valid = false;
    const divInputUrl = document.createElement("div");
    divInputUrl.style.marginBottom = inputBottomMargin;
    const spanInputUrlHead = document.createElement("span");
    spanInputUrlHead.classList.add("spanHead");
    spanInputUrlHead.innerText = "Url";
    const spanInputUrlTail = document.createElement("span");
    spanInputUrlTail.classList.add("spanTail");
    spanInputUrlTail.classList.add("spanTailAlert");
    spanInputUrlTail.innerText = "Url is required.";
    divWrapInputs.appendChild(divInputUrl);
    divInputUrl.appendChild(spanInputUrlHead);
    divInputUrl.appendChild(inputUrl);
    divInputUrl.appendChild(spanInputUrlTail);
    inputUrl.addEventListener("click", () => {
      simpleValidateUrlInput({ input: inputUrl, msgElem: spanInputUrlTail });
    });
    inputUrl.addEventListener("input", () => {
      simpleValidateUrlInput({ input: inputUrl, msgElem: spanInputUrlTail });
    });
    /* Homepage */
    const inputHome = document.createElement("input");
    inputHome.type = "text";
    // inputHome.style.backgroundImage = markerUrl;
    inputHome.style.backgroundSize = markerSize;
    inputHome.style.backgroundPosition = markerPos;
    inputHome.style.height = inputHeight + "px";
    inputHome.size = inputSize.toString();
    inputHome.placeholder = placeHolderHome;
    inputHome.dataset.valid = true; // ---------------false------------------<
    inputHome.style.border = "solid 1px " + nonRequiredCol; // --remove------<
    const divInputHome = document.createElement("div");
    divInputHome.style.marginBottom = inputBottomMargin;
    const spanInputHomeHead = document.createElement("span");
    spanInputHomeHead.classList.add("spanHead");
    spanInputHomeHead.innerText = "Homepage";
    const spanInputHomeTail = document.createElement("span");
    spanInputHomeTail.classList.add("spanTail");
    // spanInputHomeTail.classList.add("spanTailAlert");
    // spanInputHomeTail.innerText = "Homepage is required.";
    divWrapInputs.appendChild(divInputHome);
    divInputHome.appendChild(spanInputHomeHead);
    divInputHome.appendChild(inputHome);
    divInputHome.appendChild(spanInputHomeTail);
    /* Favicon URL */
    const inputFavi = document.createElement("input");
    inputFavi.type = "text";
    inputFavi.style.height = inputHeight + "px";
    inputFavi.size = (inputSize).toString();
    inputFavi.placeholder = placeHolderFav;
    inputFavi.dataset.valid = true; // ---------------false------------------<
    inputFavi.style.border = "solid 1px " + nonRequiredCol;
    divWrapInputs.appendChild(inputFavi);
    const divInputFavi = document.createElement("div");
    divInputFavi.style.marginBottom = inputBottomMargin;
    const spanInputFaviHead = document.createElement("span");
    spanInputFaviHead.classList.add("spanHead");
    spanInputFaviHead.innerText = "Favicon";
    const spanInputFaviTail = document.createElement("span");
    spanInputFaviTail.classList.add("spanTail");
    spanInputFaviTail.innerText = "Icon of the Homepage.";
    divWrapInputs.appendChild(divInputFavi);
    divInputFavi.appendChild(spanInputFaviHead);
    divInputFavi.appendChild(inputFavi);
    divInputFavi.appendChild(spanInputFaviTail);
    /* country */
    const inputCountry = document.createElement("input");
    inputCountry.type = "text";
    inputCountry.style.backgroundImage = markerUrl;
    inputCountry.style.backgroundSize = markerSize;
    inputCountry.style.backgroundPosition = markerPos;
    inputCountry.style.height = inputHeight + "px";
    inputCountry.size = inputSize.toString();
    inputCountry.placeholder = placeHolderCountry;
    divWrapInputs.appendChild(inputCountry);
    const divInputCountry = document.createElement("div");
    divInputCountry.style.marginBottom = inputBottomMargin;
    const spanInputCountryHead = document.createElement("span");
    spanInputCountryHead.classList.add("spanHead");
    spanInputCountryHead.innerText = "Country";
    const spanInputCountryTail = document.createElement("span");
    spanInputCountryTail.classList.add("spanTail");
    spanInputCountryTail.classList.add("spanTailAlert");
    spanInputCountryTail.innerText = "Please provide a country name.";
    divWrapInputs.appendChild(divInputCountry);
    divInputCountry.appendChild(spanInputCountryHead);
    divInputCountry.appendChild(inputCountry);
    divInputCountry.appendChild(spanInputCountryTail);
    /* fed state */
    const inputFed = document.createElement("input");
    inputFed.type = "text";
    inputFed.style.border = "solid 1px " + nonRequiredCol;
    inputFed.style.height = inputHeight + "px";
    inputFed.size = (inputSize + 1).toString();
    inputFed.placeholder = placeHolderFed;
    divWrapInputs.appendChild(inputFed);
    const divInputFed = document.createElement("div");
    divInputFed.style.marginBottom = inputBottomMargin;
    const spanInputFedHead = document.createElement("span");
    spanInputFedHead.classList.add("spanHead");
    spanInputFedHead.innerText = "Federated state";
    const spanInputFedTail = document.createElement("span");
    spanInputFedTail.classList.add("spanTail");
    spanInputFedTail.innerText = "";
    divWrapInputs.appendChild(divInputFed);
    divInputFed.appendChild(spanInputFedHead);
    divInputFed.appendChild(inputFed);
    divInputFed.appendChild(spanInputFedTail);
    /* langeuages need list */
    const inputLang = document.createElement("input");
    inputLang.type = "text";
    inputLang.style.border = "solid 1px " + nonRequiredCol;
    inputLang.size = (inputSize + 1).toString();
    inputLang.placeholder = placeHolderLang;
    divWrapInputs.appendChild(inputLang);
    const divInputLang = document.createElement("div");
    divInputLang.style.marginBottom = inputBottomMargin;
    const spanInputLangHead = document.createElement("span");
    spanInputLangHead.classList.add("spanHead");
    spanInputLangHead.innerText = "Languages";
    const spanInputLangTail = document.createElement("span");
    spanInputLangTail.classList.add("spanTail");
    spanInputLangTail.innerText =
      "Please press ENTER or click after every single tag to add it!";
    divWrapInputs.appendChild(divInputLang);
    divInputLang.appendChild(spanInputLangHead);
    divInputLang.appendChild(inputLang);
    divInputLang.appendChild(spanInputLangTail);
    /* search tags need a list */
    const inputTags = document.createElement("input");
    inputTags.type = "text";
    // inputTags.style.border = "solid 1px " + nonRequiredCol;
    inputTags.style.backgroundImage = markerUrl;
    inputTags.style.backgroundSize = markerSize;
    inputTags.style.backgroundPosition = markerPos;
    inputTags.style.height = inputHeight + "px";
    inputTags.size = inputSize.toString();
    inputTags.placeholder = placeHolderTag;
    inputTags.dataset.valid = false;
    divWrapInputs.appendChild(inputTags);
    const divInputTags = document.createElement("div");
    divInputTags.style.marginBottom = inputBottomMargin;
    const spanInputTagsHead = document.createElement("span");
    spanInputTagsHead.classList.add("spanHead");
    spanInputTagsHead.innerText = "Tags";
    const spanInputTagsTail = document.createElement("span");
    spanInputTagsTail.classList.add("spanTailAlert");
    spanInputTagsTail.innerText = "Tag is required.";
    inputTags.addEventListener("click", () => {
      simpleValidateTagsInput({ input: inputTags, msgElem: spanInputTagsTail });
    });
    inputTags.addEventListener("input", () => {
      simpleValidateTagsInput({ input: inputTags, msgElem: spanInputTagsTail });
    });

    // spanInputTagsTail.innerText = "Please enter tags comma separated!";
    divWrapInputs.appendChild(divInputTags);
    divInputTags.appendChild(spanInputTagsHead);
    divInputTags.appendChild(inputTags);
    divInputTags.appendChild(spanInputTagsTail);
    parent.appendChild(divWrapInputs);

    /**
     * Deactivate inputs until response of browser-info howto connect.
     *
     * #########################################################
     *
     */
    //
    // divInputFavi.style.display = "none";
    // divInputHome.style.display = "none";
    divInputCountry.style.display = "none"; // make also CC input
    divInputFed.style.display = "none";
    divInputLang.style.display = "none";
    // divInputTags.style.display = "none";

    // ret all input box refs to the save btn to cross check valid
    const boxRefs = {
      inputName: inputName,
      inputUrl: inputUrl,
      inputHome: inputHome,
      inputFavi: inputFavi,
      // inputCountry: inputCountry,
      // inputFed: inputFed,
      // inputLang: inputLang,
      inputTags: inputTags,
    };
    // Button will reed dataset.valid of input boxes
    metaData.set()["customUrlInputBoxes"] = boxRefs;
    resolve();
  });
}

/**
 * Inner div with other bg color than outer div.
 * Creates colored segments if called multiple times.
 */
function createSaveSection(o = {}) {
  return new Promise((resolve, _) => {
    const parent = document.getElementById(o.parentId);
    const spanSuccess = document.createElement("span");
    spanSuccess.innerText = "---";
    spanSuccess.style.display = "block";
    parent.appendChild(spanSuccess);
    const saveBtn = document.createElement("button");
    saveBtn.innerText = "save";
    saveBtn.classList.add("customButton_go");
    parent.appendChild(saveBtn);
    const preloadBtn = document.createElement("button");
    preloadBtn.innerText = "show me";
    preloadBtn.classList.add("customButton_showMe");
    parent.appendChild(preloadBtn);

    preloadBtn.addEventListener("click", () => {
      const boxRefs = metaData.get().customUrlInputBoxes;
      boxRefs.inputName.value = "Nachtflug";
      boxRefs.inputName.dataset.valid = "true";
      boxRefs.inputName.click();
      boxRefs.inputUrl.value = "https://server26265.streamplus.de/stream.mp3";
      boxRefs.inputUrl.dataset.valid = "true";
      boxRefs.inputUrl.click();
      boxRefs.inputHome.value = "https://www.radio-nachtflug.de/";
      boxRefs.inputFavi.value =
        "https://www.radio-nachtflug.de/templates/rnf/images/joomla-favicon.svg";
      // flag active
      boxRefs.inputName.dataset.test = "true";
      boxRefs.inputTags.value = "goth, industrial, electro";
      boxRefs.inputTags.dataset.valid = "true";
      boxRefs.inputTags.click();
    });

    saveBtn.addEventListener("click", () => {
      const boxRefs = metaData.get().customUrlInputBoxes;
      const boxStatusLst = Object.values(boxRefs).map((inputBox) => {
        if (inputBox.dataset.valid === "true") {
          return true;
        } else {
          return false;
        }
      });
      const isValid = boxStatusLst.every(Boolean);
      if (isValid) {
        getIdbValue({
          dbName: "versions_db",
          dbVersion: 1,
          objectStoreName: "dbVersions",
          id: "radio_index_db",
        }).then((db) => {
          const wait = async () => {
            // test URL online
            const isAlive = await urlAlive(boxRefs.inputUrl.value.trim());
            spanSuccess.innerText = "Done";
            if (isAlive === false)
              spanSuccess.innerText = "No response from URL";
            const stationuuid =
              "sr-custom-" + boxRefs.inputName.value.trim();
            const customObj = {
              // append this obj to infoDb[stationuuid] = ...
              isPublic: false, // no votes badge
              id: boxRefs.inputName.value.trim(),
              name: boxRefs.inputName.value.trim(),
              url: boxRefs.inputUrl.value.trim(),
              homepage: boxRefs.inputHome.value.trim(),
              tags: boxRefs.inputTags.value,
              favicon: boxRefs.inputFavi.value.trim(),
              votetimestamp: "",
              language: "",
              countrycode: "",
              changeuuid: "vanga-change-" + boxRefs.inputName.value.trim(),
              stationuuid: stationuuid,
              isFavorite: false,
              isActive: false, // runner.js set to prevent multiple fetch accident
              isPlaying: false,
              isRecording: false,
              isListening: false,
              bitRate: "",
              chunkSize: "",
              textMsg: "",
              serveruuid: null,
              url_resolved: "",
              country: "lalaLand",
              countrycode: "ZZ",
              iso_3166_2: null,
              state: "",
              language: "",
              languagecodes: "",
              votes: 0,
              lastchangetime: "",
              lastchangetime_iso8601: "",
              codec: "",
              bitrate: 0,
              hls: 0,
              lastcheckok: 1,
              lastchecktime: "2024-10-12 09:47:00",
              lastchecktime_iso8601: "2024-10-12T09:47:00Z",
              lastcheckoktime: "2024-10-12 09:47:00",
              lastcheckoktime_iso8601: "2024-10-12T09:47:00Z",
              lastlocalchecktime: "",
              lastlocalchecktime_iso8601: null,
              clicktimestamp: "",
              clicktimestamp_iso8601: null,
              clickcount: 0,
              clicktrend: 0,
              ssl_error: 0,
              geo_lat: null,
              geo_long: null,
              has_extended_info: false,
            };

            // Permanent store obj.
            setIdbValue({
              dbName: "radio_index_db",
              dbVersion: db.dbVersion,
              objectStoreName: "Custom",
              data: [customObj],
              bulkInsert: true,
            })
              .then(() => {
                // Reset UI to default, if show me button was pressed.
                if (boxRefs.inputName.dataset.test === "true") {
                  boxRefs.inputName.dataset.test = "false";
                  boxRefs.inputName.value = "";
                  boxRefs.inputName.dataset.valid = "";
                  boxRefs.inputUrl.value = "";
                  boxRefs.inputUrl.dataset.valid = "";
                  boxRefs.inputHome.value = "";
                  boxRefs.inputFavi.value = "";
                  boxRefs.inputTags.value = "";
                }
              })
              .catch((e) => console.error("Custom failed.", e));
          };
          wait();
        });
      }
    });
    resolve();
  });
}

// open ticket to connect to radio-browser db
function addCheckboxRadioBrowser(o = {}) {
  return new Promise((resolve, _) => {
    const parent = document.getElementById(o.parentId);
    const divHeadSection = document.createElement("div");
    divHeadSection.style.width = "100%";
    divHeadSection.style.marginTop = "0px";
    divHeadSection.style.padding = "4px";
    const spanTxt = document.createElement("span");
    spanTxt.innerText = "Share new radio with https://www.radio-browser.info/";
    spanTxt.classList.add("spanTail");
    spanTxt.style.verticalAlign = "14px";
    spanTxt.style.paddingLeft = "4px";
    const imgShareCustom = document.createElement("img");
    imgShareCustom.src = "images/switch-off.svg";
    imgShareCustom.style.width = "40px";

    parent.appendChild(divHeadSection);
    divHeadSection.appendChild(imgShareCustom);
    divHeadSection.appendChild(spanTxt);
    resolve();
  });
}

function addInfoMessage(o = {}) {
  return new Promise((resolve, _) => {
    const parent = document.getElementById(o.parentId);
    const divHeadSection = document.createElement("div");
    divHeadSection.style.width = "100%";
    divHeadSection.style.marginTop = "0px";
    divHeadSection.style.padding = "4px";
    const spanTxt = document.createElement("span");
    spanTxt.innerText =
      "--- App reload required ---  \n" +
      "A stream URL. Can also be a playlist URL (pls, m3u, m3u8). \n" +
      "Use Favorites / Custom button.";
    spanTxt.classList.add("spanTail");
    spanTxt.style.verticalAlign = "14px";
    spanTxt.style.paddingLeft = "4px";

    parent.appendChild(divHeadSection);
    divHeadSection.appendChild(spanTxt);
    resolve();
  });
}
