// arrowAnimation.js
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
export { runArrowAnimation };

let arrowAanimationFrameCount = 0;
let arrowTop = 0;

function runArrowAnimation() {
  // red arrow
  const divArrow = document.createElement("div");
  divArrow.id = "divArrow";
  divArrow.style.position = "absolute"; // move within wrapper; top 0 to bottom 0
  divArrow.style.left = "4px";
  divArrow.style.display = "none";

  const imgArrow = document.createElement("img");
  imgArrow.id = "imgArrow";
  imgArrow.src = "./images/red-arrow-icon.svg";
  imgArrow.style.width = "0px"; // "16px";
  divArrow.appendChild(imgArrow);

  // wrapper, log monitor, is first child
  const reportContainer = document.getElementById("reportContainer");
  const arrowStopLine = document.createElement("div");
  arrowStopLine.setAttribute("id", "arrowStopLine");
  arrowStopLine.style.position = "relative";

  reportContainer.appendChild(divArrow); // pos absolute
  // wrapper will push down this div, arrow can calc position
  reportContainer.appendChild(arrowStopLine);

  arrowAanimationFrameCount = requestAnimationFrame(animateArrow);
}

/**
 * Move the red arrow downwards animation.
 * Anchor the arrow at stop line, so it moves with the monitor base.
 */
function animateArrow() {
  // console.log("arrowAnimation->", arrowTop);
  const divArrow = document.getElementById("divArrow");
  divArrow.style.display = "block";
  const arrowStopLine = document.getElementById("arrowStopLine");
  const divArrowTop = divArrow.getBoundingClientRect().top;
  const arrowStopLineTop = arrowStopLine.getBoundingClientRect().top;

  divArrow.style.top = arrowTop.toString() + "px";

  if (divArrowTop >= arrowStopLineTop - 26) {
    // Arrow switch anchor.
    arrowStopLine.appendChild(divArrow);
    divArrow.style.top = "-26px";
    divArrow.style.left = "-12px";
    // Timeout, not simply fun call, else fail in the interpreter black box.
    setTimeout(() => {
      cancelAnimationFrame(arrowAanimationFrameCount);
    }, 0);
  }
  if (divArrowTop <= arrowStopLineTop - 80) {
    arrowTop += 2;
  }
  if (divArrowTop > arrowStopLineTop - 79) {
    arrowTop += 0.4;
  }
  arrowAanimationFrameCount = requestAnimationFrame(animateArrow);
}
