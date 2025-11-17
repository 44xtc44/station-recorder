// uiM3u8.js
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
import { sleep } from "../uiHelper.js";
import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "./uiSubmenu.js";

export { showM3u8 };

const parser = new DOMParser(); // sanitize html, mixed html with dyn. vars

async function showM3u8(o = {}) {
  const parentId = "fixedPositionAnchor";
  const radioName = o.radioName;
  const m3u8UrlTxt = o.m3u8UrlTxt;

  const m3u8Outer = await createM3u8UiOuter({
    parentId: parentId,
    childId: "m3u8Outer",
  });

  // remove X that hide the div
  m3u8Outer.removeChild(m3u8Outer.firstElementChild);
  document.getElementById("fixedPositionAnchor").style.height = "100%";
  // X must remove div
  const spanClose = document.createElement("span");
  spanClose.classList.add("handCursor");
  spanClose.innerText = "✖";
  spanClose.style.textAlign = "right";
  spanClose.style.paddingRight = "14px";
  spanClose.style.display = "inline-block";
  spanClose.style.width = "100%";
  spanClose.style.backgroundColor = "#fc4a1a";
  spanClose.addEventListener("click", () => {
    m3u8Outer.remove();
  });
  m3u8Outer.appendChild(spanClose);

  const head = await createFeatureDivSection({
    parentId: "m3u8Outer",
    childId: "headM3u8Txt",
  });

  await createM3u8UiHead({
    parentDiv: head,
    radioName: radioName,
    outerDivId: "m3u8Outer",
  });

  const hint = await createFeatureDivSection({
    parentId: "m3u8Outer",
    childId: "hintM3u8",
  });
  hint.innerText =
    "Recording is not possible at the moment. I will integrate m3u8 streams."

  const infoBlock = await createFeatureDivSection({
    parentId: "m3u8Outer",
    childId: "InfoBlockM3u8",
  });
  infoBlock.style.overflow = "auto";

  await createM3u8InfoBlock({
    parentDiv: infoBlock, // full path "InfoBlockM3u8"
    m3u8UrlTxt: m3u8UrlTxt,
    url: o.url,
  });
}

function copyEventListener(o = {}) {
  const imgCopy = o.img;
  const line = o.line;
  return new Promise((resolve, _) => {
    imgCopy.addEventListener("click", async () => {
      navigator.clipboard.writeText(line);
      imgCopy.src = "./images/copy-done-icon.svg";

      await sleep(1000);
      imgCopy.src = "./images/copy-icon.svg";
    });
    resolve();
  });
}

function createM3u8InfoBlock(o = {}) {
  return new Promise((resolve, _) => {
    const url = o.url;

    for (const line of o.m3u8UrlTxt) {
      const lineLen = line.length;
      const div = document.createElement("div");
      const spanLink = document.createElement("span");
      div.appendChild(spanLink);
      let linkPlaylist = "";
      const imgCopy = document.createElement("img");
      imgCopy.classList.add("handCursor");
      imgCopy.src = "./images/copy-icon.svg";
      imgCopy.style.height = "30px";
      imgCopy.style.marginTop = "-4px";
      spanLink.style.verticalAlign = "8px";

      if (line.includes("#EXT-X-STREAM-INF:"))
        div.innerText = line.slice(18, line.length);
      if (line.includes("#EXT-X-TARGETDURATION")) spanLink.innerText = line;
      if (line.includes("#EXT-X-MEDIA-SEQUENCE")) spanLink.innerText = line;
      if (
        !line.includes("http") &&
        !line.includes("m3u8") &&
        !line.includes("#EXTINF")
      )
        spanLink.innerText = line;

      if (line.includes("m3u8")) {
        /* full URL path */
        if (line.trim().substring(0, 5).toLowerCase() === "https") {
          linkPlaylist = '<a href="' + line + '">playlist download</a> ';

          const parsed = parser.parseFromString(linkPlaylist, "text/html");
          const tags = parsed.getElementsByTagName("body");
          for (const tag of tags) {
            spanLink.appendChild(tag);
          }
          div.appendChild(imgCopy);
          copyEventListener({ line: line, img: imgCopy });
        }
      }

      o.parentDiv.appendChild(div);
    }
    resolve();
  });
}

function createM3u8UiHead(o = {}) {
  return new Promise(async (resolve, _) => {
    const parentDiv = o.parentDiv;
    const outerDiv = document.getElementById(o.outerDivId);
    const spanName = document.createElement("span");
    const spanTxt = document.createElement("span");
    parentDiv.appendChild(spanName);
    parentDiv.appendChild(spanTxt);
    spanName.innerText = o.radioName;
    spanName.style.color = "tomato";
    spanTxt.innerText = " .m3u8";
    parentDiv.addEventListener("click", () => {
      outerDiv.style.display = "none";
    });
    resolve();
  });
}

function createM3u8UiOuter(o = {}) {
  return new Promise(async (resolve, _) => {
    try {
      document.getElementById(o.childId).remove();
    } catch (e) {}
    const divOutline = await createFeatureDivOutline({
      parentId: o.parentId,
      divOutline: o.childId,
    });
    divOutline.classList.add("column500");
    divOutline.style.width = "500px";
    divOutline.style.display = "block";
    resolve(divOutline);
  });
}
