// findDuplicateUrl.js
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
 * Welcome to sorting hell!
 * The radio-browser database hase some duplicates.
 * Get rid of them to improve user experience.
 */

/**
 * https://gitlab.com/groups/radiobrowser/-/issues
 * https://www.radio-browser.info/faq
 * faq search: "by adding entries to this Gitlab project" (needs gitlab account)
 * Accepted example:
 * https://gitlab.com/radiobrowser/radio-database/-/commit/48a7eec6ca810ea08ae2bf403cc86e8549e9467a#a3f8b2b589753c865ce04fe65ca9d06d35b8dc29
 *
 * The module is intended to help identifying double entries in the
 * stations DB and to report them to the gitlab issue board.
 * Can be those with more than 10 identical URLs at first (not overwhelm admin).
 * Fixing at least a few hundreds of worst DB vandalism.
 *
 * Second to help developing/integrating station name and URL verification.
 * Work either client or server side. May be a later project.
 * (A) radio-browser main web site. (JS ?)
 * (B) radio-browser API. (Rust ?)
 */

import { metaData } from "../central.js";
import { sortedArray } from "../utils/sorted.js";
import { dumpCandidates } from "./findDuplicateUrlsDump.js";
export { findDuplicateUrl };

/**
 * Find stations with same URLs in memory loaded db.
 * Extract all objects with the same URL.
 * Create a list of radio objects with limited properties.
 * [{uuid: url}, {uuid:url}]
 * from DB object with all properties,
 * [ {1: [{uuid: url,}] }, {} ]
 * >> cleanup the DB option
 * @returns {Array<object>} sorted by stations count
 */
async function findDuplicateUrl() {
  const db = metaData.get().infoDb; // !!! debugger, full db
  metaData.set()["infoDbLength"] = {};
  metaData.set().infoDbLength["start"] = Object.keys(db).length;

  const uuidUrls = await uuidUrlsArray();
  const sorted = await sortedArray(uuidUrls, "url");
  const duplicates = await calcDuplicatedUrls(sorted);
  const sortByLength = true; // Sort by highest count of same URL.
  const sortedDoubles = await sortedArray(duplicates, "stations", sortByLength);

  const minDoubles = 2; // least amount
  const { delUuids, delCandidates, issueArray } = await dumpCandidates(
    sortedDoubles,
    minDoubles
  );

  await cleanUpDb(db, delUuids);
  metaData.set().infoDbLength["end"] = Object.keys(db).length;

  return {
    minDoubles: minDoubles,
    sortedDoubles: sortedDoubles,
    delUuids: delUuids,
    delCandidates: delCandidates,
    issueArray: issueArray,
    infoDbLength: metaData.get().infoDbLength,
  };
}

/**
 * Fast deletion of keys from object DB.
 * Better store large data in an in-mem object
 * instead of an array.
 * @param {object} db stations db in-mem
 * @param {Array<string>} delUuids array of uuid's

 */
async function cleanUpDb(db, delUuids) {
  const delLen = delUuids.length;
  // DB size before a potential removal of double URLs.
  const dbLenStart = Object.keys(db).length;
  // Delete if array is populated.
  for await (const uuid of delUuids) {
    if (uuid in db) delete db[uuid];
  }

  const dbLenEnd = Object.keys(db).length;
  const diff = dbLenStart - dbLenEnd;
  if (diff !== delLen) {
    console.error("cleanUpDb->stations missed. diff=", diff);
  }

  // console.log("findDuplicateUrl->cleanUpDb", dbLenStart, dbLenEnd, diff, delLen);
}

/**
 * Prep an array of array obj indexes to
 * assamble a list of custom prop station objects.
 * In evaluation phase of reading the resulting JSON file
 * we can sort, work on a whole country to clean up DB double entries.
 * @returns {object<url,uuid,name,country,countrycode>}
 */
async function uuidUrlsArray() {
  const db = metaData.get().infoDb; // !!! debugger, full db
  // in { {uuid_1: {uuid: uuid_1, url:... }
  const keysUuid = Object.keys(db);
  // console.log("uuidUrlsArray->keysUuid", keysUuid);

  // out [ {uuid: uuid_1: url: urlStr_1}, {uuid: uuid_2: url: urlStr_2}, {} ]
  const uuidUrls = keysUuid.map((uuid) => {
    const url = metaData.get().infoDb[uuid].url;
    const name = metaData.get().infoDb[uuid].name;
    const countrycode = metaData.get().infoDb[uuid].countrycode;
    // [BUG], get undefined for country name after update from radio-browser gz Backup.
    // Finding, country(s) is not included in the backup JSON object!!
    // Solve pb via this app's own wikipedia based/enhanced country code to name list.
    // This will need much more work for a radio-browser's own client to
    // write a feature. Check existing URL exists before accepting a new station.
    // Download latest gz backup, decomp., check for URL exist for this country.
    const country = metaData.get().countryNames[countrycode];

    // const fullObj = metaData.get().infoDb[uuid];
    // debugger;

    return {
      url: url,
      uuid: uuid,
      name: name,
      country: country,
      countrycode: countrycode,
    };
  });

  return uuidUrls;
}

/**
 * "read ahead" in stationsContainer();
 * At an index collect all following indexex (objects) with the same URL.
 * Run idle until the next candidate is avail.
 * loop throug a sorted array of objects (by URL)
 * Collect objects with the same URL.
 * Use a for loop to use "break" and "continue".
 * @param {Array<object>} sorted
 * @returns {Array<object>} promise, stations with same URLs
 */
function calcDuplicatedUrls(sorted) {
  return new Promise((resolve, _) => {
    const duplicates = [];
    let lastIdx = 0; // ask from here for next doubles

    for (let idx = 0; idx < sorted.length; idx++) {
      if (idx < lastIdx && idx !== 0) continue;

      // inner loop
      const { mileStone, ctnr } = stationsContainer(sorted, idx);
      lastIdx = mileStone; // ret obj key, else collision with var
      if (ctnr.stations.length > 1) {
        duplicates.push(ctnr);
      }
    }
    resolve(duplicates);
  });
}

/**
 * Put at least current station object in the return and test if next is a double.
 * Caller may discard the return if only one object is in stations array.
 * @param {Array<object>} sorted
 * @param {number} idx from where to read next indexes
 * @returns {Object<number,object>} index stopped reading, stations container
 */
function stationsContainer(sorted, idx) {
  const url = sorted[idx].url.toUpperCase();

  const ctnr = {}; // container for stations with same URL
  ctnr["url"] = url; // test for double
  ctnr["stations"] = [sorted[idx]]; // accomodate one or more station objects

  const ret = {};
  ret["mileStone"] = idx;
  ret["ctnr"] = ctnr;

  for (let mileStone = idx + 1; mileStone < sorted.length; mileStone++) {
    const nextUrl = sorted[mileStone].url.toUpperCase();

    if (url !== nextUrl) break;
    if (url === nextUrl) {
      ctnr.stations.push(sorted[mileStone]);
      ret.mileStone = mileStone; // run outer loop idle to mileStone
    }
  }

  return ret;
}
