// src/i18n.js — the extension's pages in the browser's language.
// Elements marked data-i18n (text), data-i18n-title, data-i18n-placeholder
// or data-i18n-aria take their words from _locales/<language>/messages.json;
// right-to-left languages turn the page around. Anything without a
// translation keeps its English. t(key, ...subs) is for words made in code.
function t(key, ...subs) {
  try {
    const text = chrome.i18n.getMessage(key, subs.map(String)) || "";
    // In right-to-left text, keep @usernames reading left to right.
    return chrome.i18n.getMessage("@@bidi_dir") === "rtl" ? text.replace(/@[\w.]+/g, "⁨$&⁩") : text;
  } catch {
    return "";
  }
}
// The translation, or the English given.
const tr = (key, english, ...subs) => t(key, ...subs) || english.replace(/\$(\d)/g, (m, i) => subs[i - 1] ?? m);

(function applyI18n() {
  try {
    document.documentElement.lang = chrome.i18n.getUILanguage();
    document.documentElement.dir = chrome.i18n.getMessage("@@bidi_dir") || "ltr";
  } catch {}
  const run = () => {
    for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n) || el.textContent;
    for (const [attr, key] of [["title", "i18nTitle"], ["placeholder", "i18nPlaceholder"], ["aria-label", "i18nAria"]]) {
      for (const el of document.querySelectorAll(`[data-${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}]`)) {
        const value = t(el.dataset[key]);
        if (value) el.setAttribute(attr, value);
      }
    }
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", run) : run();
})();
