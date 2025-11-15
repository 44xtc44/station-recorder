// m3u8Reader.js

/**
 * m3u8 playlist from database URL arives here.
 * Decide what to do if list has:
 * (A) multiple chunk endpoints as fragmented URL "/foo0815bla?02947...8...9"
 * (B) multiple chunk endpoints as full URL "https://bar.com/cdn/foo123...4...5.mp3"
 * (C) single redirector URL to the current m3u8 playlist
 * (D) multiple redirector URL playlist targets, mostly monitor resolution qualities
 * --> currently the "first" server in the list is choosen
 *  Make an additional server call
 *  to get the current playlist or next redirect.
 *
 * Update a queue of chunk "URLs" so the downloader/player can rebuild
 * blob(s)/sourceBuffer from chunks. Plus title info, chunk timer if avail..
 * 

 */

export { processM3u8, responseTxtArray };

/**
 * Deliver a list of chunk URLs.
 * Response gets target url injected at "connectM3u8" fun.
 * Get out if we find a redirect.
 * @param {Response<string>} url
 * @param {Response} response
 * @returns {Object<string>} url: response url
 * @returns {Object<Array[string]>} chunkURLs: is what we want
 * @returns {Object<boolean>} isRedirect: or not
 * @returns {Object<string>} redirectUrl: redirected response URL
 * @returns {Object<Object>} metadata: key/values info (version, duration)
 */
async function processM3u8(response) {
  const m3u8 = { };
  const m3u8AsArray = await responseTxtArray(response);
  const m3u8Metadata = await extMarkerGet(m3u8AsArray);
  m3u8["metadata"] = m3u8Metadata;
  const chunkFragmentURLs = await extMarkerRemove(m3u8AsArray);
  const chunkURLs = await chunksFullUrls(chunkFragmentURLs, response.url);
  m3u8["chunkURLs"] = chunkURLs;
  return m3u8;
}

/**
 * @param {Response} response
 * @returns {Promise<Array[string]>}
 */
async function responseTxtArray(response) {
  const file = await response.text();
  return file.split("\n");
}

/**
 * Assamble a metadata dict.
 * @param {Array<string>} m3u8AsArray
 * @returns {Promise<Object>} metadata dict may vary (duration, version)
 */
function extMarkerGet(m3u8AsArray) {
  return new Promise((resolve, _) => {
    const metadata = {};
    const extMarker = m3u8AsArray.filter((line) => Array.from(line)[0] === "#");
    for (const ext of extMarker) {
      const pos = Array.from(ext).indexOf(":");
      if (pos === -1) continue; // no hit
      // if (ext.includes("#EXT-X-PROGRAM-DATE-TIME")) continue;

      const key = ext.substring(0, pos);
      const val = ext.substring(pos + 1, ext.length);
      metadata[key] = val;
    }
    resolve(metadata);
  });
}

/**
 * Resolve only URLs array without info #EXT marker.
 * Used .reduce() to dev/debug.
 * @param {Array<string>} m3u8AsArray
 * @returns {Promise<Array[string]>} of URLs (fragments)
 */
function extMarkerRemove(m3u8AsArray) {
  return new Promise((resolve, _) => {
    resolve(m3u8AsArray.filter((line) => !(Array.from(line)[0] === "#")));
  });
}

/**
 * Remove playlist name from URL to
 * create chunk URLS, or keep full URLs.
 * @param {Array<string>} chunkFragmentURLs
 * @param {string} responseUrl
 * @returns {Promise<Array[string]>}
 */
async function chunksFullUrls(chunkFragmentURLs, responseUrl) {
  
  const urlBase = responseUrl.substring(0, responseUrl.lastIndexOf("/"));
  const chunkURLs = [];
  for (const chunkEndpoint of chunkFragmentURLs) {
    if (chunkEndpoint.length <= 2) continue; // "/1"

    const isLink = await linkIsUrl(chunkEndpoint);
    if (isLink) chunkURLs.push(chunkEndpoint);
    if (!isLink) chunkURLs.push(urlBase + "/" + chunkEndpoint);
  }
  return chunkURLs;
}

/**
 * Helper fun for "chunksFullUrls"; better readable.
 * @param {string} chunkEndpoint to test http://FQDN
 * @returns {boolean} result true if test is ok
 */
function linkIsUrl(chunkEndpoint) {
  return new Promise((resolve, _) => {
    if (
      chunkEndpoint.toLowerCase().includes("https:") ||
      chunkEndpoint.toLowerCase().includes("http:")
    ) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}
