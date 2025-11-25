// m3u8Worker.js

/**
 * HowTo
 * dl module (master) creates only one worker instance or a worker/process pool.
 * Pool gets round robin new record orders. CPU count.
 * Worker module (slave) starts threats to dl URLs and file chunks
 * for a given stationuuid. Slave must create dicts for each tread module.
 * Slave loops over the dicts, wait for new messages.
 * Worker threats send messages with new index.
 * {stationuuid: xxxx, index: 0, url: "urlReader - stream abort", downloader: "download - extit"}
 * Worker module sends/post to dl module (master)
 */