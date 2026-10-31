// firefox/background.js — the Firefox background page: the message bus first,
// then the worker code and the export engine, which share this one page.
import "./bus.js";
import "../background.js";
import "../offscreen.js";
