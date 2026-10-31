// src/pageids.js
//
// Runs in instagram.com's own JavaScript world (manifest "world": "MAIN"),
// where Instagram's module system lives, so it can read the current id and
// provided variables of each GraphQL query the web client uses. Instagram
// rotates those ids every few weeks; reading them here keeps the exporter
// working without a release. bridge.js asks for the query names it needs.
// This file only answers and never touches the network.

(function () {
  window.addEventListener("message", (e) => {
    const ask = e.data;
    if (e.source !== window || ask?.igxIds !== "ask" || !Array.isArray(ask.names)) return;

    const ids = {};
    for (const name of ask.names) {
      if (!/^\w+$/.test(name)) continue;
      try {
        const params = window.require(`${name}.graphql`).params;
        const provided = {};
        for (const [key, variable] of Object.entries(params.providedVariables || {})) {
          try {
            provided[key] = variable.get();
          } catch {}
        }
        ids[name] = { id: String(params.id), provided };
      } catch {} // this page hasn't loaded that query
    }
    window.postMessage({ igxIds: "ids", nonce: ask.nonce, ids }, "*");
  });
})();
