// menuBarAnimation.js
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
import { setIdbValue } from "../database/idbSetGetValues.js";
import { RotatingGalaxy } from "./analyzer.js";

export { createMenuBarAnim, reloaderLogo, menuBarGalaxy };

let menuBarGalaxy = null;

function createMenuBarAnim() {
  return new Promise(async (resolve, _) => {
    const parent = document.getElementById("menuHome");

    await createMenuBarAd({ parent: parent });
    await createMenuBarGalaxy({ parent: parent });
    resolve();
  });
}

function reloaderLogo() {
  return new Promise((resolve, _) => {
    const parent = document.getElementById("menuHome");

    // reload page by click on upper left string
    document.getElementById("reloader").addEventListener("click", () => {
      location.reload(true);
    });
    // Bat behind circle is main logo.
    // Can be shown if animation is switched off. Needs read/write app_db settings.
    const divLogo = document.createElement("div");
    divLogo.setAttribute("id", "divLogo");
    divLogo.style.position = "absolute";
    divLogo.style.top = "-2px";
    divLogo.style.left = "75px";
    divLogo.style.zIndex = "5";
    divLogo.style.display = "none";

    const imgBat = document.createElement("img");
    imgBat.setAttribute("id", "imgBat");
    imgBat.src = "./images/vanga-bat-logo.svg";
    imgBat.style.width = "40px";
    parent.appendChild(divLogo);
    divLogo.appendChild(imgBat);
    // analyzer enable
    metaData.set()["vangaAnalyzer"] = true;
    resolve();
  });
}

function createMenuBarAd(o = {}) {
  return new Promise((resolve, _) => {
    const parent = o.parent;
    const divVangaAd = document.createElement("div");
    divVangaAd.id = "divVangaAd";
    divVangaAd.style.position = "absolute";
    divVangaAd.style.top = "-5px";
    divVangaAd.style.left = "220px";
    divVangaAd.style.zIndex = "0";
    divVangaAd.style.display = "none";

    const vangaAd = document.createElement("canvas");
    vangaAd.setAttribute("id", "vangaAd");
    vangaAd.style.backgroundColor = "";
    vangaAd.style.position = "absolute";
    vangaAd.style.height = "62px";
    vangaAd.style.width = "150px";
    vangaAd.style.backgroundColor = "red";
    vangaAd.style.display = "block";

    parent.appendChild(divVangaAd);
    divVangaAd.appendChild(vangaAd);

    resolve();
  });
}

function createMenuBarGalaxy(o = {}) {
  return new Promise((resolve, _) => {
    const parent = o.parent;
    const canvasWidth = 90;
    const canvasHeight = canvasWidth / 2; // original
    const zIndex = "4";
    const top = "0px";
    const divCanvasGalaxy = document.createElement("div");
    divCanvasGalaxy.id = "divCanvasGalaxy";
    divCanvasGalaxy.style.position = "absolute";
    divCanvasGalaxy.style.top = top;
    divCanvasGalaxy.style.left = "50px";
    divCanvasGalaxy.style.zIndex = zIndex;
    divCanvasGalaxy.style.display = "block";

    const canvasGalaxy = document.createElement("canvas");
    canvasGalaxy.id = "canvasGalaxy";
    canvasGalaxy.style.backgroundColor = "";
    canvasGalaxy.style.position = "absolute";
    canvasGalaxy.style.height = canvasHeight + "px";
    canvasGalaxy.style.width = canvasWidth + "px";
    parent.appendChild(divCanvasGalaxy);
    divCanvasGalaxy.appendChild(canvasGalaxy);

    menuBarGalaxy = new RotatingGalaxy({
      canvasId: "canvasGalaxy",
      offCenter: 33, // Radius of movement circle. Around an imaginary point.
      speed: 0.33,
    });

    divCanvasGalaxy.addEventListener("click", () => {
      // analyzer disabled, also canvas
      setIdbValue({
        dbName: "app_db",
        dbVersion: 1,
        objectStoreName: "appSettings",
        data: { id: "vangaAnalyzer", isActive: false },
      }).catch((e) => {
        console.log("vangaAnalyzer->no DB, load defaults", e);
      });
      divCanvasGalaxy.style.display = "none";
      divLogo.style.display = "block";
      metaData.set()["vangaAnalyzer"] = false;
    });

    divLogo.addEventListener("click", () => {
      // analyzer enable, click on bat logo
      setIdbValue({
        dbName: "app_db",
        dbVersion: 1,
        objectStoreName: "appSettings",
        data: { id: "vangaAnalyzer", isActive: true },
      }).catch((e) => {
        console.log("vangaAnalyzer->no DB, load defaults", e);
      });
      divCanvasGalaxy.style.display = "block";
      divLogo.style.display = "none";
      metaData.set()["vangaAnalyzer"] = true;
    });

    resolve();
  });
}
