// src/inpage.js — a small Kept button on photos and videos on instagram.com.
//
// It appears on hover in the top-left corner of the photo or video, where
// Instagram keeps none of its own controls (carousel arrows sit at the sides,
// the sound button and tags at the bottom). One click saves that photo or
// video, or the one you're looking at in a carousel, into
// Downloads/Instagram/<account>/. It never changes Instagram's page: the
// button floats above it and hides when you scroll or move away.
(() => {
  if (window.__keptInpage) return;
  window.__keptInpage = true;

  let enabled = true;
  chrome.storage.local.get("saveOptions").then(({ saveOptions }) => (enabled = saveOptions?.inpage !== false), () => {});
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.saveOptions) enabled = changes.saveOptions.newValue?.inpage !== false;
    if (!enabled) hide();
  });

  const style = document.createElement("style");
  style.textContent = `
.kept-save{position:fixed;z-index:2147483646;width:34px;height:34px;padding:0;border:0;border-radius:50%;display:grid;place-items:center;cursor:pointer;
background:rgba(16,24,29,.62);color:#fff;opacity:0;pointer-events:none;transform:scale(.9);transition:opacity .15s ease,transform .2s cubic-bezier(.34,1.56,.64,1),background .15s ease}
.kept-save.on{opacity:1;pointer-events:auto;transform:none}.kept-save:hover{background:rgba(16,24,29,.82)}
.kept-save:focus-visible{outline:2px solid #3282B8;outline-offset:2px}
.kept-save svg{width:18px;height:18px}.kept-save[data-state=busy] svg{animation:kept-spin .9s linear infinite}
.kept-save[data-state=done]{background:#1d7f55}.kept-save[data-state=fail]{background:#b8334a}
@keyframes kept-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.kept-save{transition:none}.kept-save[data-state=busy] svg{animation:none}}`;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "kept-save";
  btn.title = "Save with Kept";
  btn.setAttribute("aria-label", "Save this photo or video with Kept");
  btn.innerHTML = '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M201.9 131.4A74 74 0 1 1 137.5 54.6" fill="none" stroke="currentColor" stroke-width="38" stroke-linecap="round"/><circle cx="184.7" cy="80.4" r="24" fill="#BBE1FA"/></svg>';
  document.documentElement.append(style, btn);

  let target = null;
  let hideTimer = 0;
  const big = (el) => {
    const r = el.getBoundingClientRect();
    return r.width >= 160 && r.height >= 160 && !el.closest("header, nav, [role=menu]");
  };
  const fileOf = (url) => (url || "").split("?")[0].split("/").pop();
  function codeFor(el) {
    const link = el.closest('a[href*="/p/"], a[href*="/reel/"]');
    const fromLink = (a) => a?.getAttribute("href")?.match(/\/(?:p|reels?)\/([\w-]+)/)?.[1];
    const fromUrl = location.pathname.match(/\/(?:p|reels?|tv)\/([\w-]+)/)?.[1];
    if (link) return fromLink(link); // a grid thumbnail
    if (el.closest("[role=dialog]") || !el.closest("article")) return fromUrl || fromLink(el.closest("article, main")?.querySelector('a[href*="/p/"], a[href*="/reel/"]'));
    return fromLink(el.closest("article").querySelector('a[href*="/p/"], a[href*="/reel/"]')) || fromUrl;
  }
  function show(el) {
    const r = el.getBoundingClientRect();
    btn.style.left = `${Math.max(4, r.left + 10)}px`;
    btn.style.top = `${Math.max(4, r.top + 10)}px`;
    btn.classList.add("on");
  }
  function hide() {
    btn.classList.remove("on");
    target = null;
  }

  document.addEventListener("pointerover", (e) => {
    if (!enabled) return;
    if (e.target === btn || btn.contains(e.target)) return clearTimeout(hideTimer);
    const el = e.target.closest?.("img, video") || (e.target.parentElement?.querySelector?.(":scope > img, :scope > video"));
    if (el && big(el) && codeFor(el)) {
      clearTimeout(hideTimer);
      target = el;
      if (!btn.dataset.state) show(el);
    } else if (target) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, 350);
    }
  }, { passive: true });
  addEventListener("scroll", () => !btn.dataset.state && hide(), { passive: true, capture: true });
  for (const type of ["pointerdown", "mousedown", "dblclick"]) btn.addEventListener(type, (e) => e.stopPropagation());

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!target || btn.dataset.state === "busy") return;
    const code = codeFor(target);
    const isVideo = target.tagName === "VIDEO";
    btn.dataset.state = "busy";
    const resp = await chrome.runtime.sendMessage({ type: "QUICK_SAVE", code, hint: isVideo ? null : fileOf(target.currentSrc || target.src), video: isVideo }).catch((err) => ({ error: err.message }));
    btn.dataset.state = resp?.ok ? "done" : "fail";
    btn.title = resp?.ok ? `Saved ${resp.count} file${resp.count === 1 ? "" : "s"} to Downloads/Instagram` : resp?.error || "Couldn't save that.";
    setTimeout(() => {
      btn.dataset.state = "";
      btn.title = "Save with Kept";
      if (!target) hide();
    }, 1800);
  });
})();
