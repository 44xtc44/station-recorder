// fetchToBlob.js
"use strict";
/**
 * HELPER module
 * NODE import. Use fs instead of fetch during dry run.
 *
 * fetch runs local files only if index.HTML is loaded.
 * The path must be relative to 'index.html' then.
 *
 */
import * as fs from "fs";
export { readLocalToBlob, writeBlobToLocal , extension};

/**
 * NODE import. Use fs instead of fetch during dry run.
 * @param {string} relativePathToFile
 * @param {string} fileExtension
 * @returns {Promise<Blob | false>}
 * @example
 * readLocalToBlob("test.json", "json");  // from Dl folder 
 * readLocalToBlob("/js/assets/radios_europe.json", "json");
 */
async function readLocalToBlob(relativePathToFile, fileExtension) {
  const fileBuf = fs.readFileSync(relativePathToFile);
  const blob = new Blob([fileBuf], { type: fileExtension });
  return blob;
  try {

    
  } catch (e) {
    return false;
  }
}

async function writeBlobToLocal(relativePathToFile, data) {
  fs.writeFileSync(relativePathToFile, data);
  try {
    
  } catch (e) {
    return false;
  }
}


async function extension(fileName) {
  const array = fileName.split(".");
  const ext = array[array.length - 1]; // catch last dot
  return ext;
}
/* 
// belongs to test file
(async () => {
  const __dirname = import.meta.dirname; // this test module's dir
  const array = __dirname.split("/");
  for (const [idx, dir] of array.entries()) {
    if (dir === "station-recorder") {
      const pkgDir = array.slice(0, idx).join("/");

      for (const file of loaderFiles) {
        const pathRelative = "/station-recorder/static/js/assets/" + file;
        const pathToFile = pkgDir + pathRelative;
        console.log("-> pathToFile ", pathToFile);
        const ext = await extension(file);
        const blob = await readLocalToBlob(pathToFile, ext);
        console.log("-> returns ", blob, ext);
      }
    }
  }
})();
 */
