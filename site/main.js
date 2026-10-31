// Page behaviour: entrances, the nav's edge, hero parallax, counting numbers,
// the sample chat and the popup that follows the three steps. The page reads
// fine without any of it.
document.documentElement.classList.add("js");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Entrances: each part rises once as its section arrives, staggered. */
const seen = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target;
    const sibs = [...el.parentElement.querySelectorAll(":scope > .reveal")];
    el.style.transitionDelay = `${Math.min(6, Math.max(0, sibs.indexOf(el))) * 70}ms`;
    el.classList.add("in");
    seen.unobserve(el);
  }
}, { rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll(".reveal").forEach((el) => seen.observe(el));

/* The nav gets its edge once the page moves; the hero layers drift at their own depth. */
const nav = document.querySelector(".nav");
const layers = still ? [] : [...document.querySelectorAll("[data-depth]")];
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    nav.classList.toggle("scrolled", scrollY > 8);
    for (const el of layers) el.style.transform = `translate3d(0, ${(scrollY * Number(el.dataset.depth)).toFixed(1)}px, 0)`;
    ticking = false;
  });
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* The big screenshot rises from a tilt to flat as it comes up the screen. */
const tilts = still ? [] : [...document.querySelectorAll(".tilt")];
function tilt() {
  for (const el of tilts) {
    const r = el.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.75)));
    const e = 1 - Math.pow(1 - k, 3);
    el.style.transform = `perspective(1600px) rotateX(${((1 - e) * 24).toFixed(2)}deg) scale(${(0.88 + 0.12 * e).toFixed(4)}) translateY(${((1 - e) * 60).toFixed(1)}px)`;
    el.style.opacity = (0.35 + 0.65 * e).toFixed(3);
  }
}
if (tilts.length) {
  let queued = false;
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(() => { tilt(); queued = false; }); } }, { passive: true });
  addEventListener("resize", tilt);
  tilt();
}

/* Numbers count up when they come into view. */
const counted = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    counted.unobserve(e.target);
    const b = e.target, target = Number(b.dataset.count);
    if (still || !target) continue;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 1100);
      b.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}, { threshold: 0.6 });
document.querySelectorAll("[data-count]").forEach((b) => counted.observe(b));

/* The sample chat: what you type on the left is kept on the right. */
const input = document.getElementById("demo-input");
const out = document.getElementById("demo-out");
const search = document.getElementById("demo-search");
const count = document.getElementById("demo-count");
function renderChat() {
  const q = search.value.trim().toLowerCase();
  out.textContent = "";
  let n = 0, hits = 0;
  for (const raw of input.value.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([^:]{1,24}):\s*(.*)$/);
    const who = m ? m[1].trim() : "Ana";
    const text = m ? m[2] : line;
    const li = document.createElement("li");
    if (/^me$/i.test(who)) li.className = "me";
    if (/^\[photo\]$/i.test(text)) {
      li.classList.add("photo");
      const img = document.createElement("img");
      img.src = "assets/seascape.jpg";
      img.alt = "Sample photo: Paul Bril's painting of a harbour";
      img.width = 1400;
      img.height = 989;
      li.append(img);
    } else if (q && text.toLowerCase().includes(q)) {
      const i = text.toLowerCase().indexOf(q);
      const mark = document.createElement("mark");
      mark.textContent = text.slice(i, i + q.length);
      li.append(text.slice(0, i), mark, text.slice(i + q.length));
      hits++;
    } else {
      li.textContent = text;
      if (q) li.classList.add("dim");
    }
    out.append(li);
    n++;
  }
  count.textContent = q ? `${hits} of ${n} messages match “${search.value.trim()}”` : `${n} messages · saved offline`;
}
if (input) {
  input.addEventListener("input", renderChat);
  search.addEventListener("input", renderChat);
  renderChat();
}

/* How it works: the step in the middle of the screen sets the popup's state. */
const popup = document.getElementById("popup");
const counter = popup?.querySelector(".n");
const totals = { 1: 0, 2: 812, 3: 1284 };
let shown = 0;
function countTo(target) {
  if (still) return (counter.textContent = target.toLocaleString("en"));
  const from = shown, t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 900);
    shown = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)));
    counter.textContent = shown.toLocaleString("en");
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function setStep(n) {
  popup.dataset.state = String(n);
  document.querySelectorAll(".step").forEach((s) => s.classList.toggle("active", s.dataset.step === String(n)));
  countTo(totals[n]);
}
if (popup && matchMedia("(max-width: 720px)").matches) {
  // On a phone the steps can't drive a pinned popup, so it plays them itself while in view.
  let timer = null, i = 0;
  new IntersectionObserver(([e]) => {
    clearInterval(timer);
    if (!e.isIntersecting || still) return;
    timer = setInterval(() => setStep((i = (i % 3) + 1)), 2200);
  }, { threshold: 0.6 }).observe(popup);
} else if (popup) {
  const stepWatch = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) setStep(e.target.dataset.step);
  }, { rootMargin: "-45% 0px -45% 0px" });
  document.querySelectorAll(".step").forEach((s) => stepWatch.observe(s));
  setStep(1);
}
