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
 * Template.
 * MASTER container for unique sub menu layout with a termination bar.
 * @type {Object} param0 {parentId: string, childId:string}
 * @param {string} parentId Anchor div
 * @param {string} childId ID of here to be created sub menu div
 * @returns {Promise<HTMLDivElement>} Sub menu master div
 */
function createFeatureDivOutline({ parentId, childId }) {
  return new Promise((resolve, _) => {
    const parent = document.getElementById(parentId);
    const outline = document.createElement("div");
    const radius = "20px";

    outline.setAttribute("id", childId);
    outline.classList.add("subMenuOutline");
    outline.classList.add("column500");
    outline.style.width = "500px";
    outline.style.display = "block";
    outline.style.borderRadius = radius;

    const spanClose = document.createElement("span");
    spanClose.id = "terminator";
    spanClose.classList.add("handCursor");
    spanClose.innerText = "✖";
    spanClose.style.float = "right";
    spanClose.style.display = "inline-block";
    spanClose.style.textAlign = "right";
    spanClose.style.paddingRight = "14px";
    spanClose.style.display = "inline-block";
    spanClose.style.width = "100%";
    spanClose.style.height = "2em";
    spanClose.style.backgroundColor = "Crimson"; // #fc4a1a
    spanClose.style.borderRadius = radius;

    spanClose.addEventListener("click", () => {
      outline.remove();
    });

    parent.appendChild(outline);
    outline.appendChild(spanClose);

    resolve(outline);
  });
}

/**
 * Inner div with other bg color than outer div.
 * Creates colored segments if called multiple times.
 */
function createFeatureDivSection({ parentId, childId }) {
  return new Promise((resolve, _) => {
    const parent = document.getElementById(parentId);
    const inline = document.createElement("div");
    inline.setAttribute("id", childId);
    inline.classList.add("subMenuSection");

    parent.appendChild(inline);
    resolve(inline);
  });
}
