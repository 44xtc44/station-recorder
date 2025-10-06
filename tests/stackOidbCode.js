
export {createDB, hello}


function createDB() {
  var db;
  var item = [
    {
      name: "banana",
      price: "$1.99",
      description: "It is a purple banana!",
      created: new Date().getTime(),
    },
    {
      name: "apple",
      price: "$2.99",
      description: "It is a red apple!",
      created: new Date().getTime(),
    },
  ];
  var openReq = indexedDB.open("test_db", 1);

  openReq.onupgradeneeded = function (e) {
    var db = e.target.result;
    console.log("running onupgradeneeded");
    if (!db.objectStoreNames.contains("store")) {
      console.log("no store");
      var storeOS = db.createObjectStore("store", { keyPath: "name" });
    }
  };
  openReq.onsuccess = async function (e) {
    console.log("running onsuccess");
    db = e.target.result;
    await addItem(item);
    await getItem();
  };
  openReq.onerror = function (e) {
    console.log("onerror!");
    console.dir(e);
  };
}

async function addItem(item) {
  var tx = db.transaction(["store"], "readwrite");
  var store = tx.objectStore("store");
  var req;
  item.forEach(function (data) {
    req = store.add(data);
  });
  req.onerror = function (e) {
    console.log("addItem->Error", e.target.error.name);
  };
  req.onsuccess = function (e) {
    console.log("addItem->addItem->Woot! Did it", e);
  };
  tx.oncomplete = function (e) {
    console.log("addItem->tx completed", e);
  };
}

async function getItem() {
  var tx = db.transaction(["store"], "readonly");
  var store = tx.objectStore("store");
  var req = store.getAll();
  req.onerror = function (e) {
    console.log("Error", e.target.error.name);
  };
  req.onsuccess = function (e) {
    console.log("getItem->", e);
  };
}

function hello() {
  console.log("hello->")
}