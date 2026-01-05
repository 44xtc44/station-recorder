// sorted.js
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
export { sortedArray };

/**
 * Input is an array of objects.
 * Output is a new sort(ed) array.
 * Sorted by an object value, or a value's array length.
 * @param {Array<object>} array
 * @param {string} objectKey val to sort
 * @param {boolean} length true, make fun reusable
 * @returns {Array<object>} promise, by objectKey
 * @example
 * const sortedDoubles = sortedArray(duplicates, "stations", sortByLength);
 */
function sortedArray(array, objectKey, length) {
  return new Promise((resolve, _) => {
    const sorted = array.toSorted((a, b) => {
      let first = a[objectKey];
      let second = b[objectKey];
      if (length === true) {
        first = a[objectKey].length;
        second = b[objectKey].length;
      }

      if (first < second) {
        return -1;
      }
      if (first > second) {
        return 1;
      }

      // equal
      return 0;
    });
    resolve(sorted);
  });
}
