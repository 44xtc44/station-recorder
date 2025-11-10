// equalizer.js
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

import { metaData } from "../central.js";
import { getAppSettings, setAppSettings } from "../database/idbAppSettings.js";
import { audioContext, audioSource } from "./audio.js";
import {
  equalizerPresets,
  equalizerRanges,
  filterTypesList,
} from "../constants.js";

export { initEqualizer };
let gainNode = null; // audioContext will create node

// https://www.htmlelements.com/forums/topic/carousel-as-input-data/
// https://www.youtube.com/watch?v=XtFlpgaLbZ4 Carousel (Basic) - HTML, CSS & JS
// https://webdesign.tutsplus.com/how-to-build-a-simple-carousel-with-vanilla-javascript--cms-41734t

async function initEqualizer() {
  let rangeIdx = "2"; // arbitrary defaults
  let presetIdx = "15";

  const eqElem = await drawEq("eqalizerContainer");
  let eqRange = eqElem.eqRange; // "input" type select
  let eqPresets = eqElem.eqPresets;

  // Populate drop downs with text options to choose from.
  // Attaches listener. Listener applies both range and preset
  // selectedIndex attribute values on gain node and stores
  // new values in indexed DB.
  await eqRangeOptions(eqRange, eqPresets);
  await eqPresetOptions(eqRange, eqPresets);

  // Pull settings values (str nums) from indexed DB.
  const getEqVal = await getEqalizerSettings();
  // Set default values to pulled settings if this is the first app call.
  if (getEqVal.range === false) {
    getEqVal.range = {}; // getEqVal.range was "false", not object here
    getEqVal.preset = {};
    getEqVal.range["selectedIndex"] = rangeIdx;
    getEqVal.preset["selectedIndex"] = presetIdx;
    // Store, first time, default settings in indexed DB.
    await storeEqalizerSettings(rangeIdx, presetIdx);
  }

  // Set on selectedIndex displayed text in drop downs for range and presets.
  eqRange.selectedIndex = getEqVal.range.selectedIndex;
  eqPresets.selectedIndex = getEqVal.preset.selectedIndex;

  // Apply settings to (from audio element derived) gain node.
  await loadEqSettings(eqRange, eqPresets); // Load preset into equalizer.
}

/**
 * Draw Equalizer band range and presets drop downs.
 * @param {string} parentID of container to attach to
 * @returns {Object} with two DOM input elements of type select
 */
function drawEq(parentID) {
  return new Promise(async (resolve, _) => {
    const parent = document.getElementById(parentID);
    // EQ Selectors container
    const equalizerSelect = document.createElement("div");
    equalizerSelect.id = "equalizerSelect";

    const divEqRange = document.createElement("div");
    const eqRange = document.createElement("select");
    const divEqPresets = document.createElement("div");
    const eqPresets = document.createElement("select");

    divEqRange.setAttribute("id", "divEqRange");
    divEqRange.classList.add("divEqRange");

    eqRange.setAttribute("id", "eqRange");
    eqRange.setAttribute("type", "select");
    eqRange.classList.add("eqRange");

    divEqPresets.setAttribute("id", "divEqPresets");
    divEqPresets.classList.add("divEqPresets");

    eqPresets.setAttribute("id", "eqPresets");
    eqPresets.setAttribute("type", "select");
    eqPresets.classList.add("eqPresets");

    divEqRange.appendChild(eqRange);
    divEqPresets.appendChild(eqPresets);

    parent.appendChild(equalizerSelect);
    equalizerSelect.appendChild(divEqRange);
    equalizerSelect.appendChild(divEqPresets);

    await eqGrid(parent, equalizerSelect, divEqRange, divEqPresets);

    resolve({ eqRange: eqRange, eqPresets: eqPresets });
  });
}

function eqGrid(parent, equalizerSelect, divEqRange, divEqPresets) {
  return new Promise((resolve, _) => {
    parent.classList.add("grid_activity_bar_item"); // classlist grid
    // parent.classList.add("grid_activity_bar_player"); // color
    resolve();
  });
}

/**
 * Read values from indexed DB.
 * @returns {Object || false} {range:"0", preset:"2"}; "false" if not set
 */
function getEqalizerSettings() {
  return new Promise(async (resolve, _) => {
    const range = await getAppSettings({ id: "eqRange" }).catch((e) => {
      console.error("getEqalizerSettings->catch range", e);
    });
    const preset = await getAppSettings({ id: "eqPresets" }).catch((e) => {
      console.error("getEqalizerSettings->catch preset", e);
    });

    resolve({ range: range, preset: preset });
  });
}

/**
 * Create the equalizer (filter collection) and DOM audio.
 * @param {Array} frequencies band range start nums
 * @param {Array} presetIdx gain values for every band range
 */
function eqBandsSet(frequencies, presetIdx) {
  return new Promise((resovlve, _) => {
    let filterNodes = { filters: [] };
    if (gainNode !== null) {
      gainNode.disconnect(0); // needs disconnect before re-creation
      gainNode = null; // always throw away interpreter derived objects (mem leak)
    }

    gainNode = audioContext.createGain();
    audioSource.connect(gainNode);

    const promiseArray = filterTypesList.map((_, idx) => {
      return new Promise((resolve, _) => {
        let filter = audioContext.createBiquadFilter();
        filter.type = filterTypesList[idx].type;
        filter.frequency.value = frequencies[idx]; // frequency band start
        filter.gain.value = equalizerPresets[presetIdx].gains[idx];
        // https://stackoverflow.com/questions/33540440/
        // bandpass-filter-which-frequency-and-q-value-to-represent-frequency-range
        // filter and/or Q !?
        filter.Q.value = 1; // default
        filterNodes.filters.push(filter);
        gainNode.connect(filter);
        gainNode = filter;
        resolve();
      });
    });
    Promise.all(promiseArray);

    gainNode.connect(audioContext.destination);
    resovlve();
  });
}

/**
 * Draw the frequency range names.
 * @param {HTMLObjectElement} eqRange input type select
 * @param {HTMLObjectElement} eqPresets input type select
 */
function eqRangeOptions(eqRange, eqPresets) {
  return new Promise((resolve, _) => {
    eqRange.onchange = () => {
      loadEqSettings(eqRange, eqPresets);
    };

    for (let idx = 0; idx < equalizerRanges.length; idx++) {
      const option = document.createElement("option");
      option.text = equalizerRanges[idx].id;
      option.value = option.text;
      eqRange.options.add(option);
    }
    resolve();
  });
}

/**
 * Draw the preset names.
 * @param {HTMLObjectElement} eqRange input type select
 * @param {HTMLObjectElement} eqPresets input type select
 */
function eqPresetOptions(eqRange, eqPresets) {
  return new Promise((resolve, _) => {
    eqPresets.onchange = () => {
      loadEqSettings(eqRange, eqPresets);
    };

    for (let idx = 0; idx < equalizerPresets.length; idx++) {
      if (equalizerPresets[idx].is_separator) {
        const option = document.createElement("option");
        option.text = "──────────";
        eqPresets.options.add(option);
        option.disabled = true;
      } else {
        const option = document.createElement("option");
        option.text = equalizerPresets[idx].id;
        option.value = option.text;
        eqPresets.options.add(option);
      }
    }
    resolve();
  });
}

/**
 * Write range and preset values to indexed DB.
 * @param {string} rangeIdx number from array in Constants.js
 * @param {string} presetIdx number
 */
function storeEqalizerSettings(rangeIdx, presetIdx) {
  return new Promise(async (resolve, _) => {
    await setAppSettings({ id: "eqRange", selectedIndex: rangeIdx }).catch(
      (e) => {
        console.error("eqRange->DB not avail.", e);
      }
    );
    await setAppSettings({ id: "eqPresets", selectedIndex: presetIdx }).catch(
      (e) => {
        console.error("eqRange->DB not avail.", e);
      }
    );
    resolve();
  });
}

/**
 * Each time UI changes.
 * Load selected range and preset into equalizer.
 * Store the current values in indexed DB.
 * @param {HTMLObjectElement} eqRange input type select
 * @param {HTMLObjectElement} eqPresets input type select
 */
function loadEqSettings(eqRange, eqPresets) {
  return new Promise(async (resolve, _) => {
    const presetIdx = eqPresets.selectedIndex;
    const rangeIdx = eqRange.selectedIndex;

    // Choose which frequency band array to apply.
    await eqBandsSet(equalizerRanges[rangeIdx].ranges, presetIdx); // "equalizerRanges" import
    await storeEqalizerSettings(rangeIdx, presetIdx);
    resolve();
  });
}
