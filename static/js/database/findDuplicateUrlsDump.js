// findDuplicateUrlsDump.js
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
 * Final target:
 * Button press dumps JSON files to prep
 * commit to gitlab.
 * https://gitlab.com/radiobrowser/radio-database
 * Store in /src/<2-letter-country-code>/<file>.json
 *
 * >> The deletion request must not be made for all URLs.
 *
 * !! May add a feature to let user make a change request
 * for a station, automated JSON output. (geo location, tags)
 * See the "change" station part in the URL above here.
 */

/*
[
  // Example for Station deletion - comments must not be in the JSON
  // it only needs the fields "delete" and "stationuuid"
  {
    "delete": true,
    "stationuuid": "1234fee8-f678-454d-adc2-b60df370af1c"
  },
]
*/

import { sortedArray } from "../utils/sorted.js";
import { JSONToFile } from "../utils/objectToJsonFile.js";
export { dumpCandidates };
/**
 * Dump each URL with double stations from extracted obj array.
 * >> First (the only) URL must keep untouched to show it in UI.
 * @param {Array<object>} sortedDoubles [ {url:..., stations:[{},{}] } ,{},{}]
 * @param {number} minDoubles least amount of double stations per URL
 * @returns {Object<string[],object[]>} [uuid,uuid2] [{url:.,uuid:.,name:.,country:.,},{},{}]
 * @example
 * await dumpCandidates(sortedDoubles, 15); // only URLs with 15+ stations
 */
async function dumpCandidates(sortedDoubles, minDoubles) {
  const delUuids = []; // array of uuid strings to delete from DB
  const delCandidates = []; // array of station objects ("limited" keys name,uuid,country)

  for await (const urlObj of sortedDoubles) {
    if (urlObj.stations.length >= minDoubles) {
      const orgArray = urlObj.stations;
      // sort "stations" by their uuid, more robust if DB update
      const sorted = await sortedArray(orgArray, "uuid");
      
      for await (const [idx, station] of sorted.entries()) {
        if (idx === 0) continue; // sorted lowest uuid
        delUuids.push(station.uuid);
        // refac, investigate for favicon exists (may change to idx 0) later
        delCandidates.push(station);
      }
    }
  }
  const issueArray = await issueJson(delUuids);

  return {
    delUuids: delUuids,
    delCandidates: delCandidates,
    issueArray: issueArray,
  };
}

/**
 * JSON for Gitlab to delete double URL stations.
 */
async function issueJson(delUuids) {
  const issueArray = [];
  for await (const uuid of delUuids) {
    const issueDict = {
      delete: true,
      stationuuid: uuid,
    };
    issueArray.push(issueDict);
  }
  // await JSONToFile(issueArray, "dumpDuplicates.json");
  return issueArray;
}
