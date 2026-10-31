// src/datepicker.js
//
// Kept's own date picker, in place of the browser's calendar, for every
// <input type="date">. The input stays in the page (hidden) and keeps its
// yyyy-mm-dd value, so code that reads or sets .value, or listens for
// "change", works unchanged. min and max are honoured.
//
// The function is self-contained on purpose: chatpage.js copies its source
// into every offline chat archive. Colours come from --dp-* variables that
// each page sets from its own palette.

export function enhanceDates(root = document) {
  const doc = root.ownerDocument || root;
  if (!doc.getElementById("kept-dp-css")) {
    const style = doc.createElement("style");
    style.id = "kept-dp-css";
    style.textContent = `
.dp-field{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;text-align:start;white-space:nowrap}
.dp-field svg{width:16px;height:16px;flex-shrink:0;opacity:.55}
.dp-field.empty .dp-val{color:var(--dp-dim,#8fa1ad)}
.dp-pop{position:fixed;z-index:1000;width:272px;padding:12px;border-radius:16px;background:var(--dp-bg,#1b262c);color:var(--dp-text,#e6f1f7);box-shadow:0 0 0 1px var(--dp-line,#2a3943),0 18px 44px rgba(0,0,0,.3);font-size:13px;line-height:1.2;animation:dp-in .18s cubic-bezier(.16,1,.3,1)}
@keyframes dp-in{from{opacity:0;transform:translateY(-4px) scale(.98)}}
@media (prefers-reduced-motion:reduce){.dp-pop{animation:none}}
.dp-pop button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0;margin:0}
.dp-pop button:focus-visible{outline:2px solid var(--dp-ring,#3282b8);outline-offset:1px}
.dp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.dp-title{font-weight:700;font-size:14px;padding:7px 10px;border-radius:9px}
.dp-nav{width:32px;height:32px;border-radius:50%;display:grid;place-items:center}
.dp-nav svg{width:16px;height:16px}
[dir=rtl] .dp-nav svg{transform:scaleX(-1)}
.dp-title:hover,.dp-nav:hover,.dp-grid button:hover:not(:disabled):not(.on),.dp-foot button:hover{background:var(--dp-hover,rgba(127,127,127,.16))}
.dp-week,.dp-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}
.dp-week span{font-size:11px;font-weight:600;color:var(--dp-dim,#8fa1ad);padding:4px 0}
.dp-grid button{aspect-ratio:1;border-radius:50%;font-variant-numeric:tabular-nums;transition:background-color .12s}
.dp-grid button.out{color:var(--dp-dim,#8fa1ad)}
.dp-grid button.today{box-shadow:inset 0 0 0 1.5px var(--dp-accent,#3282b8)}
.dp-grid button.on{background:var(--dp-accent,#3282b8);color:var(--dp-on-accent,#fff);box-shadow:none;font-weight:700}
.dp-grid button:disabled{opacity:.28;cursor:default}
.dp-grid.months{grid-template-columns:repeat(3,1fr);gap:6px}
.dp-grid.months button{aspect-ratio:auto;padding:13px 0;border-radius:10px}
.dp-foot{display:flex;justify-content:space-between;margin-top:8px;min-height:30px}
.dp-foot button{color:var(--dp-link,#3282b8);font-weight:600;padding:7px 10px;border-radius:9px}
`;
    doc.head.append(style);
  }

  const say = (key, fallback) => {
    try { return chrome.i18n.getMessage(key) || fallback; } catch { return fallback; }
  };
  const lang = () => doc.documentElement.lang || navigator.language || "en";
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parse = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    return m ? new Date(+m[1], m[2] - 1, +m[3]) : null;
  };
  const sameDay = (a, b) => !!a && !!b && iso(a) === iso(b);
  const el = (tag, cls, text) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const icon = (d) => {
    const ns = "http://www.w3.org/2000/svg", s = doc.createElementNS(ns, "svg"), p = doc.createElementNS(ns, "path");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    for (const [k, v] of [["d", d], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", "2"], ["stroke-linecap", "round"], ["stroke-linejoin", "round"]]) p.setAttribute(k, v);
    s.append(p);
    return s;
  };
  const CAL = "M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z";
  const PREV = "M15 18l-6-6 6-6", NEXT = "M9 18l6-6-6-6";
  const valueProp = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

  let pop = null, current = null;
  const onOutside = (e) => { if (pop && !pop.contains(e.target) && !current.button.contains(e.target)) close(false); };
  const onMove = () => place();

  function close(refocus) {
    if (!pop) return;
    pop.remove();
    pop = null;
    doc.removeEventListener("pointerdown", onOutside, true);
    doc.defaultView.removeEventListener("resize", onMove);
    doc.removeEventListener("scroll", onMove, true);
    const field = current;
    current = null;
    if (refocus && field) field.button.focus();
  }

  function place() {
    if (!pop) return;
    const r = current.button.getBoundingClientRect(), win = doc.defaultView;
    const w = pop.offsetWidth, h = pop.offsetHeight, m = 8;
    let top = r.bottom + 6;
    if (top + h > win.innerHeight - m && r.top - 6 - h >= m) top = r.top - 6 - h;
    top = Math.max(m, Math.min(top, win.innerHeight - h - m));
    let left = pop.dir === "rtl" ? r.right - w : r.left;
    left = Math.max(m, Math.min(left, win.innerWidth - w - m));
    pop.style.top = top + "px";
    pop.style.left = left + "px";
  }

  function open(field) {
    close(false);
    current = field;
    const { input } = field;
    const min = parse(input.min), max = parse(input.max), picked = parse(input.value), today = new Date();
    const allowed = (d) => (!min || d >= min) && (!max || d <= max);
    let focus = picked || (max && today > max ? max : min && today < min ? min : today);
    let mode = "days";
    const L = lang();
    const rtl = (doc.documentElement.dir || "ltr") === "rtl";

    pop = el("div", "dp-pop");
    pop.dir = rtl ? "rtl" : "ltr";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", say("dpChoose", "Choose a date"));

    // Monday first unless the language says otherwise.
    let first = 1;
    try { const loc = new Intl.Locale(L); first = ((loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo)?.firstDay ?? 1) % 7; } catch {}

    function render(moveFocus) {
      pop.textContent = "";
      const head = el("div", "dp-head");
      const prev = el("button", "dp-nav"), next = el("button", "dp-nav");
      prev.type = next.type = "button";
      prev.append(icon(PREV));
      next.append(icon(NEXT));
      const title = el("button", "dp-title");
      title.type = "button";
      head.append(prev, title, next);
      pop.append(head);

      if (mode === "days") {
        const y = focus.getFullYear(), mo = focus.getMonth();
        title.textContent = new Intl.DateTimeFormat(L, { month: "long", year: "numeric" }).format(focus);
        title.setAttribute("aria-label", title.textContent + " · " + say("dpPickMonth", "Choose a month"));
        prev.setAttribute("aria-label", say("dpPrevMonth", "Previous month"));
        next.setAttribute("aria-label", say("dpNextMonth", "Next month"));
        prev.onclick = () => { focus = new Date(y, mo - 1, Math.min(focus.getDate(), 28)); render(); };
        next.onclick = () => { focus = new Date(y, mo + 1, Math.min(focus.getDate(), 28)); render(); };
        title.onclick = () => { mode = "months"; render(true); };

        const week = el("div", "dp-week");
        const wd = new Intl.DateTimeFormat(L, { weekday: "short" });
        for (let i = 0; i < 7; i++) week.append(el("span", null, wd.format(new Date(2024, 0, 7 + ((first + i) % 7)))));
        pop.append(week);

        const grid = el("div", "dp-grid");
        const start = new Date(y, mo, 1 - ((new Date(y, mo, 1).getDay() - first + 7) % 7));
        const dayFmt = new Intl.DateTimeFormat(L, { day: "numeric" }), full = new Intl.DateTimeFormat(L, { dateStyle: "full" });
        for (let i = 0; i < 42; i++) {
          const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
          const b = el("button", null, dayFmt.format(d));
          b.type = "button";
          b.dataset.day = iso(d);
          b.setAttribute("aria-label", full.format(d));
          if (d.getMonth() !== mo) b.classList.add("out");
          if (sameDay(d, today)) b.classList.add("today");
          if (sameDay(d, picked)) { b.classList.add("on"); b.setAttribute("aria-pressed", "true"); }
          b.disabled = !allowed(d);
          b.tabIndex = sameDay(d, focus) ? 0 : -1;
          b.onclick = () => pick(d);
          grid.append(b);
        }
        pop.append(grid);
      } else {
        const y = focus.getFullYear();
        title.textContent = new Intl.DateTimeFormat(L, { year: "numeric" }).format(focus);
        prev.setAttribute("aria-label", say("dpPrevYear", "Previous year"));
        next.setAttribute("aria-label", say("dpNextYear", "Next year"));
        prev.onclick = () => { focus = new Date(y - 1, focus.getMonth(), 1); render(); };
        next.onclick = () => { focus = new Date(y + 1, focus.getMonth(), 1); render(); };
        title.onclick = () => { mode = "days"; render(true); };
        const grid = el("div", "dp-grid months");
        const mf = new Intl.DateTimeFormat(L, { month: "short" });
        for (let mo = 0; mo < 12; mo++) {
          const b = el("button", null, mf.format(new Date(y, mo, 1)));
          b.type = "button";
          b.disabled = (min && new Date(y, mo + 1, 0) < min) || (max && new Date(y, mo, 1) > max);
          if (mo === focus.getMonth()) b.classList.add("on");
          b.tabIndex = mo === focus.getMonth() ? 0 : -1;
          b.onclick = () => { focus = new Date(y, mo, 1); mode = "days"; render(true); };
          grid.append(b);
        }
        pop.append(grid);
      }

      const foot = el("div", "dp-foot");
      if (input.value) {
        const clear = el("button", null, say("dpClear", "Clear"));
        clear.type = "button";
        clear.onclick = () => pick(null);
        foot.append(clear);
      } else foot.append(el("span"));
      if (allowed(new Date(today.getFullYear(), today.getMonth(), today.getDate()))) {
        const now = el("button", null, say("dpToday", "Today"));
        now.type = "button";
        now.onclick = () => pick(today);
        foot.append(now);
      }
      if (foot.querySelector("button")) pop.append(foot);
      if (moveFocus) pop.querySelector('.dp-grid [tabindex="0"]')?.focus();
    }

    pop.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(true); return; }
      if (mode !== "days" || !e.target.dataset?.day) return;
      const step = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      const months = { PageUp: -1, PageDown: 1 }[e.key];
      if (!step && !months) return;
      e.preventDefault();
      const d = parse(e.target.dataset.day);
      focus = step ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + step) : new Date(d.getFullYear(), d.getMonth() + months, Math.min(d.getDate(), 28));
      render(true);
    });

    render(false);
    doc.body.append(pop);
    place();
    pop.querySelector('.dp-grid [tabindex="0"]')?.focus();
    doc.addEventListener("pointerdown", onOutside, true);
    doc.defaultView.addEventListener("resize", onMove);
    doc.addEventListener("scroll", onMove, true);

    function pick(d) {
      input.value = d ? iso(d) : "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      close(true);
    }
  }

  for (const input of root.querySelectorAll('input[type="date"]')) {
    if (input.dataset.dp) continue;
    input.dataset.dp = "1";
    const button = el("button", "dp-field");
    button.type = "button";
    button.setAttribute("aria-haspopup", "dialog");
    const val = el("span", "dp-val");
    button.append(val, icon(CAL));
    const label = input.id && doc.querySelector('label[for="' + input.id + '"]');
    if (label) { button.id = input.id + "-dp"; label.htmlFor = button.id; }
    else if (input.getAttribute("aria-label")) button.setAttribute("aria-label", input.getAttribute("aria-label"));
    if (input.title) button.title = input.title;
    const field = { input, button };
    const paint = () => {
      const d = parse(valueProp.get.call(input));
      button.classList.toggle("empty", !d);
      val.textContent = d ? new Intl.DateTimeFormat(lang(), { day: "numeric", month: "short", year: "numeric" }).format(d) : input.dataset.empty || say("dpAnyDate", "Any date");
    };
    // Code that sets .value directly still updates what the field shows.
    Object.defineProperty(input, "value", {
      configurable: true,
      get() { return valueProp.get.call(this); },
      set(v) { valueProp.set.call(this, v); paint(); },
    });
    button.addEventListener("click", () => (current === field ? close(true) : open(field)));
    input.style.display = "none";
    input.after(button);
    paint();
  }
}
