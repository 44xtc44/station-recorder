// fileStorage.js
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

import { recMsg } from "../network/messages.js";
import { setIdbValue, getIdbValue } from "../database/idbSetGetValues.js";
export { writeFileLocal, storeBlobAsObj, resolveFileExt };

async function writeFileLocal({
  title,
  bitRate,
  radioName,
  contentType,
  chunkArray,
}) {
  let arrayBuffer = await new Blob(chunkArray).arrayBuffer();
  let blob = new Blob([arrayBuffer], { type: contentType });
  const fileExt = await resolveFileExt(contentType);
  const fileName = await buildFileName(title, bitRate, radioName, fileExt);

  const anchorElement = document.createElement("a");
  anchorElement.href = URL.createObjectURL(blob);
  anchorElement.download = fileName;
  anchorElement.style.display = "none";
  document.body.appendChild(anchorElement);
  recMsg(["write ", radioName, fileName]);
  anchorElement.click();

  anchorElement.remove();
  arrayBuffer = null;
  blob = null;
  chunkArray = [];
  // 40sec objUrl remains, red somewhere, but keeps making trouble
  setTimeout(() => URL.revokeObjectURL(anchorElement.href), 66666);
}

/**
 * Store file as blob in object store to provide playlist.
 * @param {*} options
 */
async function storeBlobAsObj({
  title,
  bitRate,
  radioName,
  stationuuid,
  contentType,
  chunkArray,
}) {
  let arrayBuffer = await new Blob(chunkArray).arrayBuffer();
  let blob = new Blob([arrayBuffer], { type: contentType });
  const fileExt = await resolveFileExt(contentType);
  const fileName = await buildFileName(title, bitRate, radioName, fileExt);
  recMsg(["write DB", radioName, fileName]);

  const db = await getIdbValue({
    dbName: "versions_db",
    dbVersion: 1,
    objectStoreName: "dbVersions",
    id: stationuuid,
  });
  setIdbValue({
    dbName: stationuuid,
    dbVersion: db.dbVersion,
    objectStoreName: "content_blobs",
    data: {
      id: fileName,
      blob: blob,
      title: title,
      size: blob.size,
      type: blob.type,
    },
  }).catch((e) => console.error("storeBlobAsObj->", e));
  arrayBuffer = null;
  blob = null;
  chunkArray = [];
}

function buildFileName(title, bitRate, radioName, fileExt) {
  return new Promise((resolve, _) => {
    resolve(
      title.concat(
        " [",
        bitRate,
        "kb ",
        radioName.substring(0, 30),
        "]",
        fileExt
      )
    );
  });
}

/**
 * Used also in streamMetaGet.js to display file type.
 * @param {*} contentType
 * @returns
 */
function resolveFileExt(contentType) {
  return new Promise((resolve, _) => {
    if (contentType === "audio/aacp" || contentType === "application/aacp") {
      resolve(".aacp");
    }
    if (contentType === "audio/aac") {
      resolve(".aac");
    }
    if (contentType === "audio/ogg" || contentType === "application/ogg") {
      resolve(".ogg");
    }
    if (contentType === "audio/mpeg") {
      resolve(".mp3");
    }
    resolve(".mp3"); // fail
  });
}
