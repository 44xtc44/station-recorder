// central.js
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
export { metaData };

/**
 * Memory storage, cache. 'metadata' variable exports the closure.
 *
 * Function expression closure with setter and getter.
 * Fun hoisted, but not as an expression, fun in 'var'. (interview quest)
 * Set, get key values may not be arrow functions, because of 'this'.
 *
 * Save/add the result of a DB request promise
 * via callback into a closure.
 * @param set a dict value(s)
 * @param get stored object from this closure
 * @param delete object from this closure
 * @returns {Object} dictionary s
 * @example
 * metaData.set()["countryCodes"] = countryCodes2To3; // {IQ:IRQ, IE:IRL}
 */
// else have interesting refs to before reload objects
// DEU ebm-radio pls choose a URL, stays after reload
let metaHome = null;
metaHome = () => {
  // outer
  return {
    delete: function (data) {
      if (data in this.dataVault) delete this.dataVault[data];
      // inner
      return this.dataVault;
    },
    get: function (data) {
      if (data === undefined) return this.dataVault;
      return this.dataVault[data];
    },
    set: function (data) {
      if (!this.dataVault) this.dataVault = {};
      if (this.dataVault[data] === undefined) this.dataVault[data] = {};
      return this.dataVault;
    },
  };
};

/**
 * Second function expression needed to access the stored val in the closure.
 */
let metaData = null;
metaData = metaHome();
