// m3u8ArtistReader.js

export { artistReader };

/**
 * Input is metadata dict with varying keys.
 * Detect artist info changes so we can cut stream chunks
 * as song or podcast and dl it.
 * @param {Object} playlist dict
 * @returns {Promise<Object>} artistInfo - nested object
 * @returns {Promise<Object><Object><string>} artist
 * @returns {Promise<Object><Object><string>} title
 */
async function artistReader(playlist) {
  if (playlist.artistInfo === undefined) {
    playlist["artistInfo"] = {
      current: { artist: "", title: "" },
      archive: { artist: "", title: "" },
    };
  }

  /**
   * Merging nested objects fails with Object.assert()
   *
   * const aInf = playlist.artistInfo;
   * const aInfCopy = Object.assert({}, aInf); // change aInf changes aInfCopy too
   */
  const aInf = playlist.artistInfo;
  const aInfCopy = JSON.parse(JSON.stringify(aInf)); // deep clone nested dict
  console.log("artistInfo->parse", aInf, aInfCopy);

  const extInf = playlist.metadata["#EXTINF"];
  if (extInf !== undefined) {
    const array = extInf.split(",");
    for (const line of array) {
      if (line.includes("artist=")) {
        const quotes = line.split("=")[1];
        aInf.current.artist = quotes.substring(1, quotes.length - 1);
      }
      if (line.includes("title=")) {
        const quotes = line.split("=")[1];
        aInf.current.title = quotes.substring(1, quotes.length - 1);
        console.log("if->", aInf, aInfCopy);
      }
    }
  }

  await changed(aInf, aInfCopy);
  return aInf;
}

/**
 * --> need better filter got / not filtered out. 
 *    File will not write to storage. Simple aA 0-9?
 * 
 * Assert, archive a <"changed"> artist/title nested dict.
 * "archive" key is used to get a writeable file name
 * from playlist.artistInfo.archive.artist and ...title.
 * {current: { artist: "", title: "" }, archive: { artist: "", title: "" },};
 * @param {Object<Object>} aInf has a possible changed artist/title
 * @param {Object<Object>} aInfCopy before the changed artist/title
 * @returns {Promise<undefined>} done
 */
function changed(aInf, aInfCopy) {
  return new Promise((resolve, _) => {
    if (
      aInf.current.artist !== aInfCopy.current.artist ||
      aInf.current.title !== aInfCopy.current.title
    ) {
      aInf.archive.artist = aInfCopy.current.artist.replace(
        /[`~!@#$%^&*_|+=?;:'",.<>\{\}\[\]\\\/]/gi,
        ""
      );
      aInf.archive.title = aInfCopy.current.title.replace(
        /[`~!@#$%^&*_|+=?;:'",.<>\{\}\[\]\\\/]/gi,
        ""
      );
      console.log("if->", aInf);
    }
    console.log("changed->", aInf, aInfCopy);
    resolve();
  });
}
