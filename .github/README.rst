



station-recorder - distributed frontend database
==================================================
.. image:: ./social-media-preview.png
            :alt: social-media-preview
            :class: with-border
            :width: 600

Overview
---------
| Vanilla JavaScript. 
| This repository shows the source code of a distributed NoSQL frontend database browser extension/app.
|

* parallel stream downloads
* play radio
* upvote your favorite station
* audio multi-band equalizer with three bandwidth selecors
* song title blacklists
* settings and blacklists backup/restore

| The app takes the the datasets of the radio-browser.info MariaDB database and stores it inside
| the browsers *indexed DB* for offline use. 
| Updates can be pulled regularly from the public DB's backup archive by a button press.
|
| Datasets are customized and loaded into the RAM of the user's device for quick access.
| The dataset dictionaries are also used by features for inter-thread commuciation.
| 
| Features, like voting for a station and downloading streams, are added to improve the 
| user experience. 
| 
| The extension app can be used with FireFox on mobile Android devices and PC.
| 
| FireFox Android/PC Add-on: https://addons.mozilla.org/en-US/firefox/addon/station-recorder-extra-stark/
|
| It needs a feature upgrade to be also an npm package via express server to support 
| all browsers out of the box. See my ''PROKIF'' project as an example.

Help
-----
The help and documentation web page vor the latest release is located online and in the 
/docs folder of the repo.

It needs improvements for code documentation and project overview, as well as technical
documentaton. This is ongoing work.

ReadTheDocs (Python, work on): https://station-recorder.readthedocs.io/en/latest/README.html

Pictures
--------

.. raw:: html

    <embed>
        <table style="width:100%">
            <tr>
                <th>
                    <img src="./app_first_time.png" alt="app_first_time"  height=80%></img>
                </th>
                <th>
                    <img src="./favorites_play.png" alt="favorites_play"  height=80%></img>
                </th>
            </tr>

            <tr>
                <th>
                    <img src="./record_play.png" alt="record_play"  height=80%></img>
                </th>
                <th>
                    <img src="./search_world.png" alt="search_world"  height=80%></img>
                </th>
            </tr>

            <tr>
                <th>
                    <img src="./selection_blacklist.png" alt="selection_blacklist"  height=80%></img>
                </th>
                <th>
                    <img src="./selection_continent.png" alt="selection_continent"  height=80%></img>
                </th>
            </tr>

            <tr>
                <th>
                    <img src="./selection_country.png" alt="selection_country"  height=80%></img>
                </th>
                <th>
                    <img src="./selection_download.png" alt="selection_download"  height=80%></img>
                </th>
            </tr>

            <tr>
                <th>
                    <img src="./selection_selection.png" alt="selection_selection"  height=80%></img>
                </th>
                <th>
                    
                </th>
            </tr>
        </table>    

    </embed>


  
Why
---

| My Python based ``Eisenradio`` idea (on top of GhettoRecorder) should be brought to
| a broader audience. The app's Python backend database will be now a JS frontend database.
| 
| To push things furter, I want to use the largest Radio/TV station stream database available.
| I distribute this large public DB to an app users indexedDB in the browser. 
| My intention was to keep things running in case of A general server shut down.
|
| Public DB https://www.radio-browser.info/, 
| and the repository at https://gitlab.com/radiobrowser, please. 
|
| The database is public available worldwide and also hosts TV station URLs. 
| radio-browser.info is fault tolerant. It has three replicating DB server online, 
| most of the time.
| 
| Additional app features, like voting and click counter display, as well as 
| stream recording shall improve the value of the app.
| 
| The local copy of the database is hosted in memory and allows super fast search  
| over radio names and genres (tags). 
|
| I added country and continent filters, because I am convinced, 
| that most people are interested in a more 'local area' search.


Browser Add-on Android/PC
--------------------------
Use the FireFox Add-on manager to locate ``station-recorder``. 

Uninstall Browser Add-on
------------------------
Remove the Add-on. ``All downloaded data are lost then``.

How it works
-------------
The Browser extension has an outdated copy of the radio-browser.info 
public database onboard and can be updated online.

The local JSON file is loaded at first run. The JSON indexed DB blob 
is loaded instead if an update was received.
Updates are allowed on a dayly basis to prevent overloading the public 
radio-browser database.

PC user can hit F12 to visit their data (FireFox 'web storage').

All data are permanently stored in the browser's IndexedDB (IDB). 
Until deinstallation. 

User setting are stored also in the IDB to survive HTML page reloads 
and browser closings.

Download feature allows to cut snippets from a station data stream and 
store them as blob in the indexed DB.
The title information of the station is stored in a blacklist IDB store 
to prevent unnessecary repeated downloads.
File blobs can be downloaded separated by station name if the next title 
was send by the station (stram cut). 

Blacklist dump allows to save all stored blacklists, as well as the 
user settings as a backup via JSON file.

The app uses a random public DB server as the session server to communicate. 
Click and vote feature sends user selected station ID to the public database. 
The app pulls every few minutes the latest dataset from the public DB API, 
for all openend station container. A badge shows the current vote and click 
counts for the station and the trend towards positive or negative numbers.

HowTo Android - install on FireFox
-----------------------------------
| 1. open Hamburger Menu
| 2. Select the puzzle icon, extensions
| 3. Scroll to the bottom and select "Find more extensions"
¼ 4. type the extension name and install

HowTo Android - Test extension
-------------------------------
| (A) Clone a branch from GitHub repo (SSH example). Use the exact branch name.
| 
|     foobar:~$ git clone -b station-recorder_1.0.0  --single-branch git@github.com:44xtc44/station-recorder.git
|     foobar:~$ cd station-recorder_1.0.0
| 
| (B) Install node.js. 
| 
| (C) Install 'web-ext' "https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/".
| 
| (D) Install Android Studio latest and create a "dummy project" to get Android Studio device manager.
| The device manager is needed to run a Android Virtual Device (AVD).
| You can also use a Phone directly. But be aware that you might need to reset it 
| to factory defaults on a "catastrophic" failure. I had to do this during another project.
| 
| (E) You then want to download the FireFox browser apk file and drag it onto the AVD. 
| Search "Firefox Nightly for Developers". If you find 'APKmirror' save, go there. 
| Else use the registration process to enable PlayStore to pull FireFox Nightly, into every AVD.
| 
| (F) Open a terminal in the root of the repo/branch clone, to load the Add-on into the AVD via USB.
| 
|     @lab42$ adb devices -l
|     List of devices attached
|     emulator-5554   offline
| 
|     @lab42$ web-ext run --target=firefox-android --android-device emulator-5554 --firefox-apk org.mozilla.fenix
| 
| The AVD and FireFox Nightly must be USB enabled (Dev mode) then.
| 
| Please be patient and wait until the extension popup notification appears on the device. 

Known issues
-------------

Recorded AAC files stuck (incomplete first/last frame)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
There is currently no aac file frame cleaner/cutter implemented.
Playing multiple recorded aac files in a browser can lead to playing silently aborted.
You can fix your files with my "aac-repair" npm package.

Long running records
^^^^^^^^^^^^^^^^^^^^^^
Abort long running records will lead to not disappearing the associated 
HTML grid station name below the search input.

Bandwith
^^^^^^^^^^
A limited WLAN connection and many running downloads 
lead to dropped fetch requests. Threats die quiet.
Needs a wathchdog threat to write at least a message.
There is no thread kill mechanism in the JS interpreter available.

Memory
^^^^^^^^
Low physical memory leads to long running search (looks like frozen), 
especially in 'World' filter button.
This may be solved by chopping the search into blocks, 
or outsource to a web worker to allow a load... with animation.
Webworker HTML code will be a huge string then.

Linter
^^^^^^
Eslint linter is showing errors and warnings. 
To reveal errors use, for example, "npm exec eslint ./static/js/index.js".
Some modules use "new Promise" and "async" in one function. 
Eslint says that this could lead to not fire a "reject". 

IndexedDB (IDB) tests
^^^^^^^^^^^^^^^^^^^^^^^
IDB is not available in node.js. Only in a browser's context.

Puppeteer

Puppeteer must be set to allow a /home folder to allow browser reload tests.
Update:
Puppeteer can not "import" modules (except itself) in a module/script. 
Called variables and function names are unkown then.
Imports before puppeteer work fine, but are lost after puppeteer import.
So, integration tests for IDB index creation and CRUD tasks can 
not be automated for now.
"eval" or fun.toString() import/injection, auto copy to file 
serialize/deserialize doesn't help either.

Playwright

Can import other modules, but IDB fails to init then.
module.toString() will not help either.
"Error Context: ../test-results/first-has-title/error-context.md"
The library is not able to recognize imported modules/functions in its
own "context" function calls. 
Test is only good for simple UI/DOM problems. Not for testing imported code.
Means all code must be manually writen to the current test module. 
This is no automation at all.

Circular dependendcies
^^^^^^^^^^^^^^^^^^^^^^^^
Circlular imports start in "radioOperations.js". Two files affected.
Use "./node_modules/.bin/madge -c --image graph.svg  static/js" with 
"Graphviz" installed on linux distro. Would need a redesign for the 
radio/station switch. Keep in mind that recorder modules are threats
discoupled from the main app. No return val for this longrunning task.
Why? Thinking: On call error it returns, on running not.
For now it's good enough. If migrate the recorder threats to webworker
this can be fixed by keeping an eye on the workers send message (use uuid).

Contributions
-------------

Pull requests are welcome.
If you want to make a major change, open an issue first to have a short discuss.


Thank you
----------
For making the database pupblic avilable. https://gitlab.com/radiobrowser

License
-------
GPLv3