// Page behaviour: entrances, the stage pictures, the sample chat, the pinned
// popup, the status list and the wordmark's scroll scale. The page reads fine
// without any of it.
document.documentElement.classList.add("js");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Entrances: each part rises once as its section arrives, staggered. */
const seen = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target;
    const sibs = [...el.parentElement.querySelectorAll(":scope > .reveal")];
    el.style.transitionDelay = `${Math.max(0, sibs.indexOf(el)) * 75}ms`;
    el.classList.add("in");
    seen.unobserve(el);
  }
}, { rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll(".reveal").forEach((el) => seen.observe(el));

/* The stage: the ring, then the keepsakes, as the intro is read. */
const pics = document.querySelectorAll(".stage-pic");
const showPic = (name) => pics.forEach((p) => p.classList.toggle("on", p.dataset.pic === name));
const middle = { rootMargin: "-45% 0px -45% 0px" };
const picWatch = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) showPic(e.target.dataset.pic);
}, middle);
document.querySelectorAll(".intro [data-pic]").forEach((p) => picWatch.observe(p));
new IntersectionObserver(([e]) => e.isIntersecting && showPic("ring"), middle).observe(document.querySelector(".hero"));
new IntersectionObserver(([e]) => e.isIntersecting && showPic("ring"), { rootMargin: "-30% 0px -30% 0px" }).observe(document.querySelector(".features"));

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
const stepWatch = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    document.querySelectorAll(".step").forEach((s) => s.classList.toggle("active", s === e.target));
    popup.dataset.state = e.target.dataset.step;
    countTo(totals[e.target.dataset.step]);
  }
}, middle);
const phone = matchMedia("(max-width: 860px)");
if (popup && phone.matches) {
  // On a phone the steps can't drive a pinned popup, so it plays them itself while in view.
  let timer = null, i = 0;
  new IntersectionObserver(([e]) => {
    clearInterval(timer);
    if (!e.isIntersecting || still) return;
    timer = setInterval(() => {
      i = (i % 3) + 1;
      popup.dataset.state = String(i);
      countTo(totals[i]);
    }, 2200);
  }, { threshold: 0.6 }).observe(popup);
} else {
  document.querySelectorAll(".step").forEach((s) => stepWatch.observe(s));
}

/* Status: the row in the middle (or under the pointer) opens and lights its check. */
const rows = [...document.querySelectorAll("#rows li")];
const checks = [...document.querySelectorAll("#check-list li")];
function activate(i) {
  rows.forEach((r, j) => r.classList.toggle("on", j === i));
  checks.forEach((c, j) => c.classList.toggle("on", j === i));
}
const rowWatch = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) activate(rows.indexOf(e.target));
}, { rootMargin: "-40% 0px -50% 0px" });
rows.forEach((r, i) => {
  rowWatch.observe(r);
  r.addEventListener("pointerenter", () => activate(i));
  r.addEventListener("focusin", () => activate(i));
});
if (rows.length) activate(0);

/* The name grows heavier as you leave the first screen. */
const word = document.getElementById("wordmark");
if (word && !still) {
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const k = Math.min(1, scrollY / innerHeight);
      word.style.transform = `scale(${1 - k * 0.07})`;
      ticking = false;
    });
  }, { passive: true });
}
