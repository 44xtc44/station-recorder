// uiPopUpNoFavorites.js
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
import { getIndex } from "../database/idbSetGetValues.js";
export { launchNoFavPopup };

/**
 * Launch a Popup if no favorites are set.
 * Inform user how to get it done.
 */
async function launchNoFavPopup() {
  const hasFavorites = await getFavorites();
  if (hasFavorites) {
    return;
  }

  blockAccess = document.getElementById("blockAccess");
  blockAccess.style.display = "block";
  const parent = blockAccess;

  const popContainer = document.createElement("div");
  popContainer.id = "containerPopUp";
  popContainer.classList.add("popupContainer");

  const headBar = document.createElement("div");
  headBar.id = "headBar";
  headBar.classList.add("grid_popup_head");
  const headDescript = document.createElement("div");
  headDescript.id = "headDescript";
  headDescript.classList.add("grid_popup_head_item");
  const close = document.createElement("div");
  close.id = "close";
  close.classList.add("grid_popup_head_item");
  close.addEventListener("click", () => {
    popContainer.remove();
    blockAccess.style.display = "none";
  });

  const headDescTxt = document.createElement("span");
  const closeCross = document.createElement("span");
  closeCross.style.verticalAlign = "4px";
  // close evt listener
  headDescript.appendChild(headDescTxt);
  close.appendChild(closeCross);
  // close icon
  const imgClose = document.createElement("img");
  imgClose.src = "./images/close-icon.svg";
  imgClose.style.width = "20px";
  closeCross.appendChild(imgClose);

  headDescTxt.textContent = "Hi there!";

  const txtContainer = document.createElement("div");
  const txtHeader = document.createElement("div");
  const txtMessage = document.createElement("div");
  txtContainer.appendChild(txtHeader);
  txtContainer.appendChild(txtMessage);

  const txtHeaderText = document.createElement("div");
  txtHeaderText.classList.add("popupHeader");
  txtHeader.appendChild(txtHeaderText);
  txtHeaderText.textContent = "You have no Favorites yet";

  const txtMsgText = document.createElement("div");
  txtMsgText.classList.add("popupText");
  txtMessage.appendChild(txtMsgText);
  txtMsgText.textContent =
    "Show stations (Radio and TV) by selecting Continent or Country. " +
    "Make a station favorite by clicking the station name and choose the star. " +
    "Tab on a station name to start recording.";

  parent.appendChild(popContainer);
  popContainer.appendChild(headBar);
  popContainer.appendChild(txtContainer);
  headBar.appendChild(headDescript);
  headBar.appendChild(close);
}

async function getFavorites() {
  const favArray = await getIndex({
    dbName: "radio_index_db",
    store: "Favorites",
  });

  if (favArray.length === 0) {
    return false;
  }
  return true;
}
