// update_ui.js
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

import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "../buildGrids/uiSubmenu.js";
export { showDbpdateUi };

function showDbpdateUi() {
  return new Promise(async (resolve, _) => {
    const parentId = "fixedPositionAnchor";
    const dbUpdOuter = await createdbUpdUiOuter({
      parentId: parentId,
      childId: "dbUpdOuter",
    });

    // remove X that hide the div
    dbUpdOuter.removeChild(dbUpdOuter.firstElementChild);
    document.getElementById("fixedPositionAnchor").style.height = "100%";
    // X must remove div
    const spanClose = document.createElement("span");
    spanClose.id = "dbUpdClose";
    spanClose.classList.add("handCursor");
    spanClose.innerText = "✖";
    spanClose.style.textAlign = "right";
    spanClose.style.paddingRight = "14px";
    spanClose.style.display = "inline-block";
    spanClose.style.width = "100%";
    spanClose.style.backgroundColor = "#fc4a1a";
    spanClose.addEventListener("click", () => {
      dbUpdOuter.remove();
    });
    dbUpdOuter.appendChild(spanClose);
    // caller enable
    spanClose.style.display = "none";

    const head = await createFeatureDivSection({
      parentId: "dbUpdOuter",
      childId: "dbUpdHead",
    });

    const hint = await createFeatureDivSection({
      parentId: "dbUpdOuter",
      childId: "dbUpdHint",
    });

    const infoBlock = await createFeatureDivSection({
      parentId: "dbUpdOuter",
      childId: "dbUpdInfoBlock",
    });
    infoBlock.style.overflow = "auto";

    resolve();
  });
}

function createdbUpdUiOuter(o = {}) {
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
