// default_radios.js
"use strict";
export { default_radios };


/**
 * The following fields are mandatory for custom stations.
 * central.js has no validity checker, so far. DB dump.
 * 
 * name:
 * stationuuid: (use "sr-custom-" +  name)
 * id: (same as stationuuid)
 * url:
 * homepage: (can be '')
 * favicon: (can be '')
 * tags: (can be '')
 * 
 */
const default_radios = [
  {
    id:"sr-custom-" + "¡Que Viva México!",
    name: "¡Que Viva México!",
    stationuuid: "sr-custom-" + "¡Que Viva México!", 
    url: "http://quevivamexico.com/listen.pls",
    homepage: "",
    favicon: "http://cdn-radiotime-logos.tunein.com/s190365d.png",
    tags: "folk music,oldies",
  },
  /* {
    id: "HEXX 9 Radio",
    radio_url: "http://cast6.citrus3.com:2199/tunein/aaxiainteractive.pls",
    tags: "ambient,darkwave,ebm,film,gothic,witch house,witchhouse",
    favicon: "",
    country: "the united states of america",
    language: "english",
    isPLS: true,
    isM3U: false,
    isM3u8: false,
    isPlaylist: true,
    gridMember: [],
    countrycode: "us",
    ccTo3char: "USA",
    protocol: "http",
    description: "",
    isFavorite: false,
    isActive: false,
    isPlaying: false,
    url: "http://cast6.citrus3.com:2199/tunein/aaxiainteractive.pls",
    isRecording: false,
    isListening: false,
    bitRate: "",
    chunkSize: "",
    textMsg: "",
  },
  {
    id: "Kupreški Radio",
    radio_url: "http://178.209.2.100:10000/live.mp3",
    tags: "nebeski radio",
    favicon: "https://www.kupreskiradio.com/favicon/apple-touch-icon.png",
    country: "bosnia and herzegovina",
    site_url: "https://www.kupreskiradio.com/",
    language: "bosnian,croatian",
    isPLS: false,
    isM3U: true,
    isM3u8: false,
    isPlaylist: true,
    gridMember: [],
    countrycode: "ba",
    ccTo3char: "BIH",
    protocol: "http",
    description: "",
    stationuuid: "0356e497-ffb7-11e9-bbf2-52543be04c81",
    isFavorite: false,
    isActive: false,
    isPlaying: false,
    url: "http://178.209.2.100:10000/live.mp3",
    isRecording: false,
    isListening: false,
    fail: true,
    bitRate: "192, 192",
    chunkSize: "16000",
    textMsg: "",
  },
  {
    id: "ラジオ石巻",
    description: "",
    radio_url:
      "https://mtist.as.smartstream.ne.jp/30037/livestream/playlist.m3u8",
    site_url: "https://superradio.cc/",
    favicon: "https://superradio.cc/favicon.ico",
    isPLS: true,
    isM3U: false,
    isM3u8: true,
    isPlaylist: true,
  },
  {
    id: "BR24M3U8 DEU fail",
    stationuuid: "44vanga44-pseudo-BR24M3U8 DEU fail",
    description: "",
    radio_url: "https://mcdn.hf.br.de/br/hf/br24/master-96000.m3u8",
    site_url: "https://github.com/44xtc44",
    favicon: "",
  },
  {
    id: "BR24live DEU blabla",
    description: "",
    radio_url: "https://dispatcher.rndfnk.com/br/br24/live/mp3/mid",
    site_url: "https://github.com/44xtc44",
    favicon: "",
    stationuuid: "sr-custom-BR24live DEU blabla",
  },
  {
    id: "亚洲音乐台【2023.10.18】CHN",
    description: "",
    radio_url: "http://asiafm.hk:8000/asiafm",
    site_url: "https://github.com/44xtc44",
    favicon: "",
    stationuuid: "sr-custom-亚洲音乐台【2023.10.18】CHN",
  },
  {
    id: "dev Icecast+Mixxx local",
    description: "",
    radio_url: "http://localhost:8000/radio",
    site_url: "https://github.com/44xtc44",
    favicon: "",
    stationuuid: "sr-custom-dev Icecast+Mixxx local",
  },
  {
    id: "SunshineLiveWorkout DEU",
    description: "",
    radio_url:
      "http://sunsl.streamabc.net/sunsl-workout-mp3-192-3330865?sABC=5nr16rqq%230%23q40266oo6p321s1695o82262nq851ppo%23Jroenqvb-Cynlre&amsparams=playerid:Webradio-Player;skey:1524723421",
    site_url: "https://github.com/44xtc44",
    favicon: "",
    stationuuid: "sr-custom-SunshineLiveWorkout DEU",
  },
  {
    id: "Nachtflug DEU",
    description: "Goth Electro",
    radio_url: "https://server26265.streamplus.de/stream.mp3",
    site_url: "",
    favicon: "",
    stationuuid: "sr-custom-Nachtflug DEU",
  },
  {
    id: "zenStyle DEU",
    description: "Zen style",
    radio_url: "https://radio4.cdm-radio.com:18004/stream-mp3-Zen",
    site_url: "",
    favicon: "",
    stationuuid: "sr-custom-zenStyle DEU",
  },
  {
    id: "Paloma DEU",
    description: "Berlin, Germany ",
    radio_url: "https://pool.radiopaloma.de/RADIOPALOMA.mp3",
    site_url: "",
    favicon: "",
    stationuuid: "sr-custom-Paloma DEU",
  },
  {
    id: "lagrosseradio FRA play fail",
    description: "Paris, France - reggae",
    radio_url: "http://hd.lagrosseradio.info:8000/lagrosseradio-reggae-192.mp3",
    site_url: "",
    favicon: "",
    stationuuid: "sr-custom-lagrosseradio FRA play fail",
  }, */
];
