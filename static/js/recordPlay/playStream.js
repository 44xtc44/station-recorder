// playStream.js
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

import { shakaPlayer } from "../M3U8_HLS/shakaPlayer.js";
import { recMsg } from "../network/messages.js";
import { metaData } from "../central.js";
import { submitStationClicked } from "../network/publicDbCom.js";
import { detectStream } from "../network/streamDetect.js";
import { locateTarget } from "../M3U8_HLS/m3u8Downloader.js";

export { switchPlayer };

/**
 * Player off, new player on.
 * @param {string} name 
 * @param {string} stationuuid 
 * @returns {Promise<undefined>}
 */
async function switchPlayer(name, stationuuid) {
  const playingUuid = await playBtnState(stationuuid);
  if (playingUuid === "STOP") {
    await playerOff(stationuuid);
    return;
  }
  await playerOff(playingUuid);
  await playerOn(stationuuid, name, playingUuid);
}

/**
 * Play button press. 
 * Detect current player should stop or new player start.
 * @param {string} stationuuid 
 * @returns {Promise<string>} "STOP" || current player stationuuid
 */
function playBtnState(stationuuid) {
  return new Promise((resolve, _) => {
    metaData.set().infoDb[stationuuid].isPlaying = true; // station obj itself

    /**
     * Create an extra dict to switch player.
     * Else loop over 50k objects to find out someone is playing.
     * Need to switch grids and audio, video elements separate.
     * {player: {stationuuid: ""}, {isM3U8: false}}
     */
    const isRegistered = metaData.get().player;
    if (isRegistered === undefined) {
      metaData.set()["player"] = {
        stationuuid: "", // audio elem currently playing
        isM3U8: false, // video elem stream needs .unload() command
      };
    }

    const playingUuid = metaData.get().player.stationuuid;
    // STOP playing. Same button press again.
    if (playingUuid === stationuuid || playingUuid === "") {
      metaData.set().player.stationuuid = "";
      metaData.set().infoDb[stationuuid].isPlaying = false;
    }
    // Other station play button pressed.
    if (playingUuid !== stationuuid) {
      metaData.set().player.stationuuid = stationuuid;
      if (playingUuid !== "") {
        metaData.set().infoDb[playingUuid].isPlaying = false; // DB unregister prev. station
      }
      resolve(playingUuid);
    }
    resolve("STOP");
  });
}

/**
 * Unload HLS or audio stream.
 * @param {string} playingUuid
 * @returns {Promise<undefined>}
 */
async function playerOff(playingUuid) {
  const audio = document.getElementById("audioWithControls");
  const video = document.getElementById("videoScreen");
  video.style.display = "none";

  await shakaPlayer.unload();
  await shakaPlayer.detach(video);
  audio.pause(); // load a base64 audio silent string to get .onended
  // video.pause();
  if (playingUuid !== "") {
    metaData.set().infoDb[playingUuid].isPlaying = false;
    await playBtnColorOff(playingUuid);
  }
}

/**
 * Connect HLS or audio stream to a new player.
 * @param {string} stationuuid needs to be played next
 * @param {string} stationName needs to be played next
 * @param {string} playingUuid current player can be "hidden" from UI (country selected)
 */
async function playerOn(stationuuid, stationName, playingUuid) {
  metaData.set().infoDb[stationuuid].isPlaying = true;
  // If switched between continent or country station btn is gone. Other div stack shown.
  const hiddenBtn = document.getElementById(playingUuid + "_listenBox");
  if (hiddenBtn !== null) await playBtnColorOff(playingUuid);
  await playBtnColorOn(stationuuid, stationName);
  /**
   * Grid elem under monitor displays current audio elem connected station name.
   * Other button was pressed before.
   * streamActivity.js can mute (pause)
   */
  const audio = document.getElementById("audioWithControls");
  if (audio.muted) audio.muted = !audio.muted;
  const video = document.getElementById("videoScreen");

  await streamConnect(stationuuid, audio, video); // shaka is (module import)
  submitStationClicked(stationuuid, stationName); // to inet public DB
  // UI display - country 3char code
  let ccTo3char = metaData.get().infoDb[stationuuid].ccTo3char;
  if (ccTo3char === undefined) ccTo3char = "CUSTOM_URL";
  recMsg({
    stationuuid: stationuuid,
    txt: "play " + ccTo3char + " " + stationName,
    level: "success",
  });
}

/**
 * (A) Shaka player is used for all HLS .m3u8 streams with video element.
 * (B) Audio streams via audio element.
 * Volume, analyzer and equalizer manage both audio and video element.
 * Each stream type got its own streamDetect module.
 * @param {string} stationuuid
 * @param {HTMLAudioElement} audio audio element
 * @param {HTMLVideoElement} video instance
 */
async function streamConnect(stationuuid, audio, video) {
  const isM3U8 = metaData.get().infoDb[stationuuid].isM3u8;
  if (isM3U8) {
    // HLS stream
    const playlistURL = metaData.get().infoDb[stationuuid].url;
    const url = await locateTarget(playlistURL); // possible redirect in .m3u8 file
    if (url === false) {
      return;
    }

    metaData.set().player.isM3U8 = true;
    await shakaPlayer.attach(video);

    try {
      await shakaPlayer.load(url);
    } catch (shakaError) {
      console.error("playerOn->shaka load", shakaError.code); // action!
      // video.poster error msg, or jpg or favicon or ...
      return;
    }
    const audioOnly = shakaPlayer.isAudioOnly();
    const videoOnly = shakaPlayer.isVideoOnly();
    if (videoOnly || (!audioOnly && !videoOnly)) {
      video.style.display = "block";
    }
  }

  if (!isM3U8) {
    // Audio stream is online, or resolve a playlist URL.
    const urlObj = await detectStream(stationuuid);
    if (urlObj.url === false) return;

    metaData.set().player.isM3U8 = false;
    audio.src = urlObj.url; // can be empty str
  }
}

function playBtnColorOn(stationuuid, stationName) {
  return new Promise((resolve, _) => {
    const divActivityPlayer = document.getElementById("divActivityPlayer");
    divActivityPlayer.innerText = stationName;
    divActivityPlayer.style.visibility = "visible";
    const playBtn = document.getElementById(stationuuid + "_listenBox");
    // not yet created
    if (playBtn !== null) {
      playBtn.style.backgroundColor = "#49bbaa"; // #49bbaa
      const playImg = document.getElementById("playImg_" + stationuuid);
      playImg.src = "./images/speaker-icon-on.svg";
    }
    resolve();
  });
}

function playBtnColorOff(stationuuid) {
  return new Promise((resolve, _) => {
    const divActivityPlayer = document.getElementById("divActivityPlayer");
    if (divActivityPlayer !== null) {
      divActivityPlayer.innerText = "---";
      divActivityPlayer.style.visibility = "hidden";
    }
    const listenBox = document.getElementById(stationuuid + "_listenBox");
    if (listenBox !== null) listenBox.style.backgroundColor = "transparent";

    const playImg = document.getElementById("playImg_" + stationuuid);
    if (playImg !== null) playImg.src = "./images/speaker-icon-off.svg";
    resolve();
  });
}
