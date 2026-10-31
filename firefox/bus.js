// firefox/bus.js — Firefox has no offscreen documents, so the export engine
// (offscreen.js) runs in the background page beside background.js. A page
// never receives its own runtime.sendMessage, so messages between those two
// halves are delivered here too, as well as to other pages (the popup).
// Loaded first, before either half adds a listener.

const listeners = [];
const onMessage = chrome.runtime.onMessage;
const addListener = onMessage.addListener.bind(onMessage);
onMessage.addListener = (fn) => {
  listeners.push(fn);
  addListener(fn);
};

const sendRemote = chrome.runtime.sendMessage.bind(chrome.runtime);
chrome.runtime.sendMessage = (msg, callback) => {
  const local = new Promise((resolve) => {
    let waiting = false;
    let done = false;
    const reply = (value) => {
      if (!done) {
        done = true;
        resolve(value);
      }
    };
    for (const fn of listeners) {
      if (fn(msg, { id: chrome.runtime.id, url: location.href }, reply) === true) waiting = true;
    }
    if (!waiting) setTimeout(() => reply(undefined), 0);
  });
  const remote = sendRemote(msg).catch(() => undefined);
  const result = Promise.all([local, remote]).then(([here, there]) => (here !== undefined ? here : there));
  if (typeof callback === "function") result.then(callback);
  return result;
};
