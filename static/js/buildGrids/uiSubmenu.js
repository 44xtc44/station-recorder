// uiSubmenu.js
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
export { createFeatureDivOutline, createFeatureDivSection };

/**
 * outer div with border
 */
function createFeatureDivOutline(o = {}) {
  return new Promise((resolve, _) => {
    const parent = document.getElementById(o.parentId);
    const divOutline = document.createElement("div");
    divOutline.setAttribute("id", o.divOutline);
    divOutline.classList.add("subMenuOutline");

    const spanClose = document.createElement("span");
    spanClose.classList.add("handCursor");
    spanClose.innerText = "✖";
    spanClose.style.float = "right";
    spanClose.style.display = "inline-block";

    spanClose.addEventListener("click", () => {
      divOutline.remove();
    });

    parent.appendChild(divOutline);
    divOutline.appendChild(spanClose);

    resolve(divOutline);
  });
}

/**
 * Inner div with other bg color than outer div.
 * Creates colored segments if called multiple times.
 */
function createFeatureDivSection(o = {}) {
  return new Promise((resolve, _) => {
    const parent = document.getElementById(o.parentId);
    const divInline = document.createElement("div");
    divInline.setAttribute("id", o.childId);
    divInline.classList.add("subMenuSection");

    parent.appendChild(divInline);
    resolve(divInline);
  });
}
