// objectToJsonFile.js
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

/**
 * Read the station object array after "update database" and store
 * the objects in a splitted JSON file.
 * Maximum file size for Mozilla extension is 200mb.
 * Maximum binary file size for Mozilla Test to pass is 60mb.
 * Maximum JSON file size for Mozilla Test to pass is 4mb.
 *
 * Write max. 2000 objects to a JSON file to pass the requirement.
 * JSON file reader must read the array of splitted files then.
 */

export { splitStoreDictArray, JSONToFile };

/**
 * Split an object array and store the chunks
 * in separate files with chunk number added.
 * Store the chunks by caller to make read-in
 * more simple.
 * @param {Array}  dictArray [{},{},{}]
 * @param {number} chunkSize
 * @param {string} fileNameJson
 * @returns {Promise} done
 * @example
 * splitStoreDictArray(dictArray, 2000, 'dumpFile.json');
 */
function splitStoreDictArray(dictArray, chunkSize, fileNameJson) {
  return new Promise(async (resolve, _) => {
    let chunkNum = 0;
    let start = 0;
    let end = chunkSize;
    const fileWriter = [];

    while (true) {
      const arrayChunk = dictArray.slice(start, end);
      if (arrayChunk.length === 0) {
        break;
      }

      const chunkName = fileNameJson.concat("_", chunkNum, ".json");
      const chunkDict = {};
      chunkDict[chunkName] = arrayChunk;
      fileWriter.push(chunkDict);

      start += chunkSize;
      end += chunkSize;
      chunkNum++;
    }
    resolve(fileWriter);
  });
}

/**
 * Dumps file to browsers default /download() folder
 * This construct will add an additional array if the input is an array!!!
 * [ [{},{},{}] ] -> remove with json.flat(1),
 * @param {Object} obj
 * @param {string} filename
 * @returns {Promise} done
 * @example
 * await JSONToFile(dictionary, 'jsonFile.json');
 */
function JSONToFile(obj, filename) {
  return new Promise((resolve, _) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    console.log("JSONToFile->", blob);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    resolve();
  });
}
