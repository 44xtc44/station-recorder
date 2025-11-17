// m3u8Connect.js
import { recMsg } from "../network/messages.js";
export { connectM3u8 };

async function connectM3u8(url) {
  let contentType = "audio/x-mpegurl";
  const fetchOpt = {
    method: "GET",
    mode: "cors",
    cache: "no-store",
  };

  // Response will be a playlist or redirect list.
  const response = await fetch(url, fetchOpt).catch(() => {
    return "NETWORK_ERROR";
  });

  if (response !== "NETWORK_ERROR") {
    contentType = response.headers.get("Content-Type");
    if (contentType === null) {
      recMsg(["fail ::M3U8_NO_CONTENT-TYPE", url]);
      return false;
    }
  }

  // Filter out errors and redirects.
  if (response.status < 200 || response.status > 300) {
    // false Server response
    console.error("detectStream->::SERVER_ERROR", url);
    recMsg(["fail ::M3U8_SERVER_ERROR", url]);
    return false;
  }
  if (response === "NETWORK_ERROR") {
    recMsg(["fail ::M3U8_NETWORK_ERROR", url]);
    return false;
  }

  return response;
}
