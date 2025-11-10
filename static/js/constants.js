// constants.js
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

export {
  continentNames,
  areaCountries,
  topFilter,
  continentCountries,
  // Country arays
  africa_countries,
  asia_countries,
  eu_countries,
  central_america_countries,
  north_america_countries,
  south_america_countries,
  oceania_countries,
  // favs
  favStoreNames,
  continentAreas,
  user_agents, // some obfuscation multi connect, IP is same, so what?
  // EQ arrays
  equalizerPresets,
  equalizerRanges,
  filterTypesList,
  // com with radio-browser-info
  waitTimeRadioBrowserInfo,
  nameSrvRadioBrowserInfo,
  appUserAgent,
  radioBrowserInfoDict,
  fetchOpt,
  gzJsonBkpRadioBrowserInfo,
};

const appUserAgent = "stationRecorder/1.0";

const addHeaders = new Headers();
addHeaders.append("User-Agent", appUserAgent);
const fetchOpt = {
  method: "GET",
  mode: "cors",
  headers: addHeaders,
};

// 3600x1000 1h; 3600x1000x24 86400000 24h * days
const waitTimeRadioBrowserInfo = (0 * 1).toString();
/* const waitTimeRadioBrowserInfo = (86400000 * 1).toString(); */

const nameSrvRadioBrowserInfo =
  "https://all.api.radio-browser.info/json/servers";

const gzJsonBkpRadioBrowserInfo =
  "https://backups.radio-browser.info/radiobrowser_stations_latest.json.gz";

const radioBrowserInfoDict = [
  // if name server is dead at first app start
  {
    ip: "2a01:4f9:c012:3620::1",
    name: "fi1.api.radio-browser.info",
  },
  { ip: "2a0a:4cc0:c0:27c1::1", name: "de1.api.radio-browser.info" },
  {
    ip: "2a01:4f8:c2c:f004::1",
    name: "de2.api.radio-browser.info",
  },
  {
    ip: "2a0a:4cc0:0:db9:282b:91ff:fed0:ddea",
    name: "at1.api.radio-browser.info",
  },
  { ip: "162.55.180.156", name: "de2.api.radio-browser.info" },
  { ip: "152.53.85.3", name: "de1.api.radio-browser.info" },
  { ip: "37.27.202.89", name: "fi1.api.radio-browser.info" },
  { ip: "89.58.16.19", name: "at1.api.radio-browser.info" },
];

[];

// object stores of favorites; test, custom, favorites store
// test good and broken, custom urls not in db, favorites from db with star
const favStoreNames = ["Custom", "Favorites"];

const north_america_countries = [
  "ag",
  "ai",
  "bb",
  "bm",
  "bs",
  "ca",
  "cu",
  "dm",
  "do",
  "ht",
  "jm",
  "kn",
  "ky",
  "ms",
  "mx",
  "pm",
  "pr",
  "tc",
  "um",
  "us",
  "vg",
  "vi",
  "vc",
  "tt",
];

const central_america_countries = ["bz", "cr", "gt", "hn", "ni", "pa", "sv"];
const south_america_countries = [
  "ar",
  "aw",
  "bo",
  "bq",
  "br",
  "cl",
  "co",
  "cw",
  "ec",
  "fk",
  "gd",
  "gf",
  "gp",
  "gy",
  "lc",
  "mq",
  "py",
  "pe",
  "sr",
  "uy",
  "ve",
];

const oceania_countries = [
  "au",
  "aq",
  "as",
  "ck",
  "cx",
  "fj",
  "gu",
  "nc",
  "nu",
  "nz",
  "pf",
  "pg",
  "pw",
  "sh",
  "tf",
  "tv",
  "vu",
  "wf",
];

// object stores of europe
const eu_countries = [
  "ad",
  "at",
  "ax",
  "al",
  "ba",
  "be",
  "bg",
  "by",
  "ch",
  "cy",
  "cz",
  "de",
  "dk",
  "ee",
  "es",
  "fi",
  "fo",
  "fr",
  "gb",
  "gg",
  "gi",
  "gl",
  "gr",
  "hr",
  "hu",
  "ie",
  "im",
  "is",
  "it",
  "li",
  "lu",
  "lt",
  "lv",
  "mc",
  "me",
  "mk",
  "mt",
  "md",
  "nl",
  "no",
  "pl",
  "pt",
  "ro",
  "rs",
  "ru",
  "se",
  "si",
  "sk",
  "sm",
  "tr",
  "ua",
  "va",
  "xk",
];

const asia_countries = [
  "ae",
  "af",
  "am",
  "az",
  "bd",
  "bh",
  "bn",
  "cn",
  "ge",
  "hk",
  "id",
  "il",
  "in",
  "io",
  "iq",
  "ir",
  "jo",
  "jp",
  "kh",
  "kr",
  "kg",
  "kp",
  "kw",
  "kz",
  "la",
  "lb",
  "lk",
  "mm",
  "mn",
  "mo",
  "my",
  "np",
  "om",
  "ph",
  "pk",
  "ps",
  "qa",
  "sa",
  "sg",
  "sy",
  "th",
  "tj",
  "tl",
  "tm",
  "tw",
  "uz",
  "vn",
  "ye",
];

const africa_countries = [
  "ao",
  "bf",
  "bj",
  "bi",
  "bw",
  "cd",
  "cf",
  "cg",
  "ci",
  "cm",
  "cv",
  "dz",
  "eg",
  "er",
  "et",
  "gh",
  "gm",
  "gn",
  "gq",
  "gw",
  "ke",
  "km",
  "ls",
  "ly",
  "ma",
  "mg",
  "ml",
  "mu",
  "mw",
  "mz",
  "na",
  "ne",
  "ng",
  "re",
  "rw",
  "sc",
  "sd",
  "sl",
  "sn",
  "so",
  "ss",
  "st",
  "sz",
  "td",
  "tg",
  "tn",
  "tz",
  "ug",
  "yt",
  "za",
  "zm",
  "zw",
];

/**
 * deconstruct, compare with JSON file,
 * find missing countrycodes
 */
const continentAreas = [
  central_america_countries,
  north_america_countries,
  south_america_countries,
  oceania_countries,
  eu_countries,
  asia_countries,
  africa_countries,
];

/**
 * Area names for global search.
 * Those are not all continentNames, but I keep the names here.
 */
const continentNames = [
  "Africa",
  "Central America",
  "North America",
  "South America",
  "Asia",
  "Europe",
  "Oceania",
  "World",
];

const areaCountries = {
  World: continentAreas.flat(Infinity),
  Asia: asia_countries,
  Africa: africa_countries,
  "Central America": central_america_countries,
  "North America": north_america_countries,
  "South America": south_america_countries,
  Europe: eu_countries,
  Oceania: oceania_countries,
};

const topFilter = {
  Favorites: { Favorites: favStoreNames },
  "Country filter": {
    "Country filter": {
      Africa: africa_countries,
      "Central America": central_america_countries,
      "North America": north_america_countries,
      "South America": south_america_countries,
      Asia: asia_countries,
      Europe: eu_countries,
      Oceania: oceania_countries,
    },
  },
  "World filter": { "World filter": continentNames },
};

const continentCountries = {
  Favorites: favStoreNames,
  Country: continentAreas.flat(Infinity), // array of 2-char country codes
  Continent: continentNames,
  World: continentNames,
};

const user_agents = [
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/37.0.2062.94 Chrome/37.0.2062.94 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko",
  "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/600.8.9 (KHTML, like Gecko) Version/8.0.8 Safari/600.8.9",
  "Mozilla/5.0 (iPad; CPU OS 8_4_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12H321 Safari/600.1.4",
  "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10240",
  "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:40.0) Gecko/20100101 Firefox/40.0",
  "Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; rv:11.0) like Gecko",
  "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko",
  "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:40.0) Gecko/20100101 Firefox/40.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/600.7.12 (KHTML, like Gecko) Version/8.0.7 Safari/600.7.12",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:40.0) Gecko/20100101 Firefox/40.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/600.8.9 (KHTML, like Gecko) Version/7.1.8 Safari/537.85.17",
  "Mozilla/5.0 (iPad; CPU OS 8_4 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12H143 Safari/600.1.4",
  "Mozilla/5.0 (iPad; CPU OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12F69 Safari/600.1.4",
  "Mozilla/5.0 (Windows NT 6.1; rv:40.0) Gecko/20100101 Firefox/40.0",
  "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)",
  "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)",
  "Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; Touch; rv:11.0) like Gecko",
  "Mozilla/5.0 (Windows NT 5.1; rv:40.0) Gecko/20100101 Firefox/40.0",
  "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; GIL 3.5; rv:11.0) like Gecko",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:41.0) Gecko/20100101 Firefox/41.0",
  "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; MATBJS; rv:11.0) like Gecko",
];

const equalizerPresets = [
  { id: "flat", gains: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0] },
  { is_separator: true },
  {
    id: "classical",
    gains: [7.5, 6.0, 5.0, 4.0, -2.5, -2.5, 0.0, 3.5, 5.0, 6.0],
  },
  { id: "club", gains: [0.0, 0.0, 4.8, 3.4, 3.4, 3.4, 1.9, 0.0, 0.0, 0.0] },
  { id: "dance", gains: [6.0, 11.0, 7.5, 0.0, 2.5, 5.0, 8.0, 7.5, 6.0, 0.0] },
  {
    id: "electronic",
    gains: [7.0, 6.5, 2.0, 0.0, -3.0, 3.0, 1.5, 2.0, 6.5, 7.5],
  },
  { id: "jazz", gains: [6.5, 5.0, 2.0, 3.0, -2.5, -2.5, 0.0, 2.0, 5.0, 6.5] },
  { id: "latin", gains: [4.5, 2.5, 0.0, 0.0, -2.5, -2.5, -2.5, 0.0, 5.0, 7.5] },
  {
    id: "lounge",
    gains: [-5.0, -2.5, -1.0, 2.0, 6.5, 2.0, 0.0, -2.5, 3.0, 1.5],
  },
  { id: "pop", gains: [1.0, 2.9, 4.3, 4.8, 3.4, 0.0, -1.4, -1.4, 1.0, 1.0] },
  { id: "reggae", gains: [0.0, 0.0, 0.0, -3.4, 0.0, 3.8, 3.8, 0.0, 0.0, 0.0] },
  { id: "rock", gains: [8.0, 6.5, 5.0, 2.0, -0.5, -1.0, 0.5, 4.0, 5.5, 7.5] },
  { id: "ska", gains: [-1.4, -2.9, -2.4, 0.0, 2.4, 3.4, 5.3, 5.8, 6.7, 5.8] },
  { id: "techno", gains: [4.8, 3.4, 0.0, -3.4, -2.9, 0.0, 4.8, 5.8, 5.8, 5.3] },
  { is_separator: true },
  {
    id: "earbuds",
    gains: [2.9, 6.7, 3.4, -1.9, -1.4, 1.0, 2.9, 5.8, 7.7, 8.6],
  },
  {
    id: "phone",
    gains: [5.6, 9.9, 6.0, 1.7, 2.1, 5.1, 5.6, 5.8, 7.7, 8.6],
  },
  {
    id: "small box",
    gains: [9.0, 7.0, 6.5, 4.0, 2.0, 0.0, -2.0, -4.5, -5.5, -7.0],
  },
  {
    id: "bass boost",
    gains: [7.5, 6.0, 5.0, 3.5, 1.5, 0.0, 0.0, 0.0, 0.0, 0.0],
  },
  {
    id: "treble boost",
    gains: [0.0, 0.0, 0.0, 0.0, 0.0, 1.5, 4.0, 6.0, 7.0, 8.5],
  },
];

const equalizerRanges = [
  {
    id: "A",
    ranges: [40, 80, 160, 300, 600, 1200, 2400, 5000, 10000, 20000],
  },
  {
    id: "B",
    ranges: [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
  },
  {
    id: "C", // winamp
    ranges: [70, 180, 320, 600, 1000, 3000, 6000, 12000, 14000, 16000],
  },
];

const filterTypesList = [
  // filter type for each frequency band
  { type: "lowshelf" }, // 0
  { type: "peaking" },
  { type: "peaking" }, // 2
  { type: "peaking" },
  { type: "peaking" }, // 4
  { type: "peaking" },
  { type: "peaking" }, // 6
  { type: "peaking" },
  { type: "peaking" }, // 8
  { type: "highshelf" },
];
