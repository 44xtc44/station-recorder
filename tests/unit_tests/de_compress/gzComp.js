// gzComp.test.js
"use strict";

import {
  BlobReader,
  ZipReader,
  ZipWriter
} from "@zip.js/zip.js";
console.log(ZipReader)


import {
  readLocalToBlob,
  writeBlobToLocal,
  extension,
} from "./blobReadWrite.js";
const blobs = [];
const blobsComp = [];
const loaderFile = "loaderFile.json";
const loaderFiles = [
  "loaderFile.json",
  "radioBrowserInfoDb_0.json",
  "radioBrowserInfoDb_1.json",
  "radioBrowserInfoDb_2.json",
];

(async () => {
  const __dirname = import.meta.dirname; // this test module's dir
  const array = __dirname.split("/");
  for (const [idx, dir] of array.entries()) {
    if (dir === "station-recorder") {
      const pkgDir = array.slice(0, idx).join("/");

      for (const fileName of loaderFiles) {
        const pathRelative = "/station-recorder/static/js/assets/" + fileName;
        const pathToFile = pkgDir + pathRelative;
        console.log("-> pathToFile ", pathToFile);
        const ext = await extension(fileName);
        const blob = await readLocalToBlob(pathToFile, ext);
        console.log("-> returns ", blob, ext, fileName);
        blobs.push({ blob: blob, fileName: fileName });
        const blobStream = blob.stream();

        // Create a compressed stream.
        const compressedStream = blobStream.pipeThrough(
          new CompressionStream("gzip")
        );
        // Collect all Uint8Arrays (bytes) from stream to create a compressed blob
        const chunks = [];
        for await (const chunk of compressedStream) {
          chunks.push(chunk);
        }
        const blobCompr = new Blob(chunks);
        blobsComp.push(blobCompr);
        console.log(
          "-> compressed, uncompressed, diff ",
          blobCompr,
          blob,
          blob.size - blobCompr.size
        );
      }
      // const arrayBuffer = await new Blob(buffer, { type: "file.gzip" }).arrayBuffer();
      // await writeBlobToLocal(".", buffer);
    }
  }
})();
