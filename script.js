// Work wall: repeat each column's tiles so the drift loops seamlessly (--copies in CSS must match)
const WALL_COPIES = 4;
document.querySelectorAll(".wall-track").forEach((track) => {
  const originals = [...track.children];
  for (let n = 1; n < WALL_COPIES; n++) {
    originals.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("img").forEach((img) => img.setAttribute("alt", ""));
      track.appendChild(clone);
    });
  }
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A screen height for layout that ignores the phone address bar sliding in and out while scrolling.
// Pins and fitted type are sized from it; it only updates when the width changes (rotation, a real resize)
// or, on mouse devices, when the window height changes. Sizing them from the live innerHeight made the
// page ~150px taller or shorter every time the bar moved, so content jumped under the finger.
const coarse = window.matchMedia("(pointer: coarse)").matches;
let layoutVh = window.innerHeight;
let layoutVw = window.innerWidth;
window.addEventListener("resize", () => {
  if (window.innerWidth !== layoutVw || !coarse) {
    layoutVw = window.innerWidth;
    layoutVh = window.innerHeight;
  }
});

// Work wall: every column drifts at the same speed. The CSS loop moves each track by one copy of its
// tiles, so a taller column needs a longer loop; the duration is set from each column's own height.
// Speed is relative to the column width, so it feels the same on every screen size.
const WALL_SPEED = 0.035; // column widths per second
const wall = document.querySelector(".wall");
const wallTracks = [...document.querySelectorAll(".wall-track")];
const wallAnims = () => wallTracks.flatMap((t) => t.getAnimations());
const setWallSpeed = () => {
  wallTracks.forEach((track) => {
    const anim = track.getAnimations()[0];
    if (!anim) return; // reduced motion: no animation
    const gap = parseFloat(getComputedStyle(track).rowGap) || 0;
    const period = (track.offsetHeight + gap) / WALL_COPIES; // one copy, in px
    const duration = (period / (track.offsetWidth * WALL_SPEED)) * 1000;
    const old = anim.effect.getTiming().duration;
    if (!duration || Math.abs(duration - old) < 1) return;
    // keep each column where it is, so a resize never makes the wall jump
    const progress = ((anim.currentTime || 0) % old) / old;
    anim.effect.updateTiming({ duration });
    anim.currentTime = progress * duration;
  });
};
if (wall && !reduceMotion) {
  setWallSpeed();
  let wallTick = false;
  new ResizeObserver(() => {
    if (!wallTick) { wallTick = true; requestAnimationFrame(() => { wallTick = false; setWallSpeed(); }); }
  }).observe(wall);
  // pause the drift while the wall is off screen (it never pauses on hover)
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      wallAnims().forEach((a) => (entry.isIntersecting ? a.play() : a.pause()));
    }).observe(wall);
  }
}

// Gallery videos: play only while on screen (saves CPU/battery, esp. with the cloned copy);
// with reduced motion they stay on their poster frame
const galleryVideos = document.querySelectorAll(".wall video");
if (reduceMotion) {
  galleryVideos.forEach((v) => { v.removeAttribute("autoplay"); v.pause(); });
} else if ("IntersectionObserver" in window) {
  const vio = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.play().catch(() => {});
      else target.pause();
    });
  });
  galleryVideos.forEach((v) => vio.observe(v));
}

// Smooth (inertia) scrolling with Lenis; skipped for reduced motion
if (window.Lenis && !reduceMotion) {
  window.lenis = new Lenis({
    lerp: 0.1,                 // lower = smoother / longer glide
    autoRaf: true,
    anchors: true,             // in-page links glide too (offset comes from scroll-padding-top in CSS)
  });
}

// Headline, reel version (how-test.html, after the user's heading-animation.gif): the words sit on a
// vertical strip and the whole word moves as a block, one word per change. Timed from the GIF: a slow
// pull-back, a short pause, one smooth move, a small overshoot that settles. The direction alternates
// (down, then up), as in the GIF. The window has a fixed width (the longest word) and each word is
// centered in it, so nothing ever moves sideways.
const reel = document.querySelector(".rotator-reel");
if (reel && !reduceMotion) {
  const HOLD = 2500;      // time each word stays on screen (ms)
  const DURATION = 900;   // one change (ms)
  const BACK = 0.14;      // pull-back, in words
  const OVER = 0.14;      // overshoot, in words
  const words = reel.dataset.words.split(",").map((w) => w.trim()).filter(Boolean);
  reel.textContent = "";
  const strip = document.createElement("span");
  strip.className = "reel-strip";
  // three slots: above, current, below; the next word is put above or below just before each move
  const slots = [0, 1, 2].map(() => {
    const el = document.createElement("span");
    el.className = "rotator-word";
    strip.appendChild(el);
    return el;
  });
  reel.appendChild(strip);
  const at = (p) => `translateY(${(-p / 3) * 100}%)`; // share of the strip's height, so it scales with the font
  let index = 0;
  // every slot always holds a word, so all three are exactly one line tall
  // words are drawn by CSS from data-t (not text nodes), so search engines read the heading's word only once (from .sr-only)
  slots.forEach((el, i) => { el.dataset.t = words[i === 1 ? 0 : 1 % words.length]; });
  strip.style.transform = at(1);
  const fit = () => {
    // measure every word in a spare slot and keep the window at the longest
    const spare = slots[0], keep = spare.dataset.t;
    reel.style.width = `${Math.max(...words.map((w) => { spare.dataset.t = w; return spare.offsetWidth; }))}px`;
    spare.dataset.t = keep;
  };
  fit();
  document.fonts?.ready.then(fit);
  window.addEventListener("resize", fit);

  if (words.length > 1) {
    let dir = -1; // -1: the strip moves down, so the new word comes from above (the GIF's first change)
    setInterval(() => {
      if (document.hidden) return;
      index = (index + 1) % words.length;
      const to = 1 + dir;
      slots[to].dataset.t = words[index];
      strip.style.transform = at(to); // the end state underneath the animation
      strip.animate([
        { transform: at(1), easing: "cubic-bezier(0.45, 0, 0.55, 1)" },
        { transform: at(1 - dir * BACK), offset: 0.22 },
        { transform: at(1 - dir * BACK), offset: 0.31, easing: "cubic-bezier(0.55, 0, 0.3, 1)" },
        { transform: at(to + dir * OVER), offset: 0.72, easing: "cubic-bezier(0.33, 1, 0.68, 1)" },
        { transform: at(to) },
      ], { duration: DURATION }).onfinish = () => {
        // move the word back to the middle slot (same word, same spot, so nothing visibly changes)
        slots[1].dataset.t = words[index];
        strip.style.transform = at(1);
      };
      dir = -dir;
    }, HOLD + DURATION);
  }
}

// Headline: rotate the last word, letter by letter
const rotator = document.querySelector(".rotator:not(.rotator-reel)");
if (rotator && !reduceMotion) {
  const HOLD = 3600; // time each word stays on screen (ms)
  const words = rotator.dataset.words.split(",").map((w) => w.trim()).filter(Boolean);
  rotator.textContent = "";
  const spans = words.map((word, i) => {
    const wordEl = document.createElement("span");
    wordEl.className = "rotator-word" + (i === 0 ? " is-current" : "");
    [...word].forEach((ch, n) => {
      const c = document.createElement("span");
      c.className = "char";
      c.style.setProperty("--i", n);
      c.dataset.t = ch; // drawn by CSS, so the letters aren't page text (see the reel note above)
      wordEl.appendChild(c);
    });
    rotator.appendChild(wordEl);
    return wordEl;
  });
  let index = 0;
  const fit = () => { rotator.style.width = `${spans[index].offsetWidth}px`; };
  fit();
  document.fonts?.ready.then(fit);
  window.addEventListener("resize", fit);

  if (spans.length > 1) {
    setInterval(() => {
      if (document.hidden) return;
      const prev = spans[index];
      index = (index + 1) % spans.length;
      const next = spans[index];
      prev.classList.replace("is-current", "is-leaving");
      next.classList.add("is-current");
      fit();
      // After the exit finishes, snap the old word back below without animating
      setTimeout(() => {
        prev.classList.add("no-anim");
        prev.classList.remove("is-leaving");
        void prev.offsetWidth;
        prev.classList.remove("no-anim");
      }, 1400);
    }, HOLD);
  }
}

// About: photo on the name, in review at ?photo=hover (2026-10-06, user). The portrait leaves the section and
// shows, at about its in-section size, while the pointer is on the name in the statement: it fades and scales in
// and trails the cursor (eased each frame), kept inside the screen. On touch screens a tap on the name shows it
// centered on the screen; any other tap or a scroll hides it. Runs before the pinned reveal measures the section.
const arNamePhoto = new URLSearchParams(location.search).get("photo") === "hover" && document.querySelector(".v2 .ar-photo");
const arName = document.querySelector(".ar-name");
if (arNamePhoto && arName) {
  document.documentElement.classList.add("photo-hover");
  const card = document.createElement("figure");
  card.className = "name-photo";
  card.setAttribute("aria-hidden", "true");
  const img = arNamePhoto.querySelector("img");
  img.loading = "eager";
  card.append(img);
  arNamePhoto.remove();
  document.body.append(card);
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const M = 16; // keep it this far inside the screen
  const place = (cx, cy) => {
    const w = card.offsetWidth, h = card.offsetHeight;
    const x = Math.min(Math.max(M, cx - w / 2), window.innerWidth - w - M);
    const y = Math.min(Math.max(M, cy - h / 2), window.innerHeight - h - M);
    return [x, y];
  };
  const set = ([x, y]) => {
    card.style.setProperty("--nx", `${x.toFixed(1)}px`);
    card.style.setProperty("--ny", `${y.toFixed(1)}px`);
  };
  if (canHover) {
    let target = null, pos = null, raf = 0, on = false;
    const tick = () => {
      raf = 0;
      if (!target) return;
      if (!pos || reduceMotion) pos = target.slice();
      else { pos[0] += (target[0] - pos[0]) * 0.14; pos[1] += (target[1] - pos[1]) * 0.14; }
      set(pos);
      if (on && (Math.abs(target[0] - pos[0]) > 0.3 || Math.abs(target[1] - pos[1]) > 0.3)) raf = requestAnimationFrame(tick);
    };
    const move = (e) => {
      target = place(e.clientX, e.clientY);
      if (!raf) raf = requestAnimationFrame(tick);
    };
    arName.addEventListener("pointerenter", (e) => {
      on = true;
      pos = null; target = place(e.clientX, e.clientY); set(target); // start where the cursor is, then trail it
      card.classList.add("is-on");
      requestAnimationFrame(() => card.classList.add("is-following"));
    });
    arName.addEventListener("pointermove", move);
    arName.addEventListener("pointerleave", () => {
      on = false;
      card.classList.remove("is-on", "is-following");
    });
  } else {
    const hide = () => card.classList.remove("is-on");
    arName.addEventListener("click", (e) => {
      e.stopPropagation();
      if (card.classList.contains("is-on")) { hide(); return; }
      set(place(window.innerWidth / 2, window.innerHeight / 2));
      card.classList.add("is-on");
    });
    document.addEventListener("click", hide);
    window.addEventListener("scroll", hide, { passive: true });
  }
}

// About: pinned blur reveal (how-test.html), after the user's reference. The statement sits ~100px under
// the hero and starts sharpening as soon as it scrolls into view. When it reaches the top third of the screen
// the stage pins (position: sticky, so the browser keeps it perfectly in step with the scroll) for D px:
// the rest of the words sharpen, then the photo comes up to meet the text, then the page scrolls on.
// JS only sets the blur/opacity of the words and the photo's offset, from the scroll position, so
// scrolling back plays it in reverse. Updates run on Lenis's own frame (same frame as the scroll).
const ar = document.querySelector(".ar");
if (ar && !reduceMotion) {
  const track = ar.querySelector(".ar-inner");
  const stage = ar.querySelector(".ar-content");
  const text = ar.querySelector(".ar-text");
  const lower = ar.querySelector(".ar-lower");
  const words = [];
  // Split on ordinary spaces only (a no-break space keeps two Latin words in one box, otherwise the two
  // inline-blocks are ordered right to left in Hebrew). Elements inside the statement, like the tool logos that
  // stand in for "Framer", "Webflow" and "Claude Code" (2026-10-06), join the word they touch, so "ב-" + logo
  // + "," sharpen together as one word
  const nodes = [...text.childNodes];
  text.textContent = "";
  let cur = null;
  const open = () => {
    if (!cur) { cur = document.createElement("span"); cur.className = "w"; text.append(cur); words.push(cur); }
    return cur;
  };
  nodes.forEach((node) => {
    if (node.nodeType !== 3) { open().append(node); return; }
    node.textContent.split(/([ \t\n\r]+)/).forEach((part) => {
      if (!part) return;
      if (/^[ \t\n\r]+$/.test(part)) { cur = null; text.append(" "); return; }
      open().append(part);
    });
  });
  // trim a leading or trailing space left from the markup's indentation
  while (text.firstChild && text.firstChild.nodeType === 3) text.firstChild.remove();
  while (text.lastChild && text.lastChild.nodeType === 3) text.lastChild.remove();
  ar.classList.add("ar-on");

  const START = 0.88;   // the first word starts when the text's middle is at 88% of the screen height
  const PIN = 0.32;     // the text pins with its middle at 32% of the screen height (the reference's top third)
  const REVEAL = 0.6;   // share of the pin by which the last word is switched on
  const SETTLE = REVEAL; // the photo starts peeking in at the exact point the last word is revealed (user);
                         // until then it waits just below the screen, then rises to meet the text
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const easeOut = (t) => Math.sin((Math.PI * t) / 2); // moves at once, slows as the photo meets the text
  let D = 0, vh = 0, pinAt = 0, lead = 0, lastY = null, hide = 0, restTop = 0, lvh = 0;
  // a probe for the large viewport height (100lvh), the most a phone screen shows with its toolbars tucked away
  const lvhProbe = document.createElement("div");
  lvhProbe.style.cssText = "position:fixed;top:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none";
  lvhProbe.setAttribute("aria-hidden", "true");
  document.body.appendChild(lvhProbe);
  const state = words.map(() => null);

  const update = () => {
    const y = window.scrollY;
    if (y === lastY) return;
    lastY = y;
    const s = y - pinAt; // < 0 before the pin, 0..D while pinned
    // words: the scroll decides which words are switched on (from START, before the pin, to REVEAL,
    // inside the pin); each switched-on word then sharpens on its own via a CSS transition, so a word never
    // stays half blurred when the reader stops mid-scroll (user). Scrolling back switches words off again.
    const r = clamp01((s + lead) / (lead + REVEAL * D)) * words.length;
    words.forEach((w, i) => {
      const on = r > i;
      if (on === state[i]) return;
      state[i] = on;
      w.classList.toggle("is-on", on);
    });
    // photo: fully below the screen until SETTLE, then it peeks in and rises to meet the text by the end
    const settle = easeOut(clamp01((s / D - SETTLE) / (1 - SETTLE)));
    // how far it waits below its resting place: measured against the screen height right now, not layoutVh,
    // because on phones the address bar hides while scrolling and the screen gets taller than the layout height
    // (with layoutVh the photo peeked in at the bottom early). This only moves the photo, so the page never jumps.
    // The largest the screen can be (lvh: the area behind phone toolbars too, since iOS Safari's toolbars are see-through
    // and page content shows under them) plus a margin, so the waiting photo can never show at the bottom edge
    const screenH = Math.max(vh, lvh, window.innerHeight, window.visualViewport ? window.visualViewport.height : 0) + 40;
    hide = Math.max(0, Math.round(screenH - restTop));
    lower.style.transform = settle < 1 ? `translate3d(0, ${Math.round(hide * (1 - settle))}px, 0)` : "";
    // and until its entrance starts (the last word revealed) the photo block isn't drawn at all: when the toolbar
    // animated back in on scroll-up, the photo flashed through it for a moment (user-reported on mobile)
    lower.style.visibility = settle > 0 ? "" : "hidden";
  };
  const measure = () => {
    vh = layoutVh;
    D = Math.round(vh * 1.8);
    const textMid = text.offsetTop + text.offsetHeight / 2;  // inside the stage
    const stickyTop = Math.max(90, Math.round(vh * PIN - textMid)); // the text's middle pins at PIN, clear of the header
    stage.style.top = `${stickyTop}px`;
    const pad = parseFloat(getComputedStyle(track).paddingTop);
    track.style.height = `${pad + stage.offsetHeight + D}px`; // the stage's height plus D of pinned scrolling
    const stageDocTop = track.getBoundingClientRect().top + window.scrollY + pad;
    pinAt = stageDocTop - stickyTop;
    // how far below its resting place the photo waits so that it is just out of sight while pinned
    restTop = stickyTop + lower.offsetTop; // the photo block's resting top on the screen while pinned
    lvh = lvhProbe.offsetHeight;
    lead = START * vh - (stickyTop + textMid);
    lastY = null;
    update();
  };
  measure();
  document.fonts?.ready.then(measure);
  window.addEventListener("load", measure);
  window.addEventListener("resize", measure);
  if (window.lenis) window.lenis.on("scroll", update);
  window.addEventListener("scroll", update, { passive: true });
}

// How I work: journey (how-test.html?how=journey, 2026-10-06, user; made "more cinematic, more dramatic" the same
// day). One circle, the project, travels through the three principles as the page scrolls; every value below is a
// function of the pin's progress p (0..1), so the story plays at the reader's pace and runs backwards on the way up.
//   0.02–0.28  End to end: a pen with a glowing tail sets off from the start ring and traces the dashed design all
//              the way round; a shockwave when the loop closes
//   0.30–0.42  the traced circle shrinks into the first of four steps; the row fades in
//   0.42–0.66  Transparency: it moves along the row step by step, each step pulsing as it's left done behind
//   0.66–0.80  the row fades; the circle leaves the last step and grows
//   0.78–0.92  Partner: a second ring slides in and links with it, woven over and under; a last pulse round both
// Cinema on top: the page dims to a dark band as the section arrives (and lights up again as it leaves), a soft
// spotlight sits behind the drawing, and a "camera" (the SVG viewBox) moves through the story: a close-up on the
// start ring that pulls back, a slow push-in during the trace, a wide shot for the row (drifting with the circle),
// a push-in on the rings. Lines keep their on-screen width through the zoom (non-scaling strokes; the traced line
// and its glow get their width from the zoom each frame, since pathLength dashes can't be non-scaling).
const hj = document.querySelector(".hj");
if (hj && !hj.hidden && !reduceMotion) {
  const track = hj.querySelector(".hj-track");
  const $ = (s) => hj.querySelector(s);
  const all = (s) => [...hj.querySelectorAll(s)];
  const art = $(".hj-art");
  const dash = $(".hj-dash"), trace = $(".hj-trace"), glow = $(".hj-glow"), start = $(".hj-start"), pen = $(".hj-pen");
  const proj = $(".hj-proj"), ring = $(".hj-ring"), partner = $(".hj-partner"), weave = $(".hj-weave");
  const pulseA = $(".hj-pulse-a"), pulseS = $(".hj-pulse-s"), pulseL = $(".hj-pulse-l");
  const rows = all(".hj-row"), dones = all(".hj-done"), steps = all(".hj-step");
  const count = $(".hj-count b"), bar = $(".hj-bar");
  const C = 300, CY = 180, R = 90, SR = 34, STEPS = [459, 353, 247, 141];
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // ease in-out
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const mix = (a, b, t) => a + (b - a) * t;
  const set = (el, attrs) => { for (const k in attrs) el.setAttribute(k, typeof attrs[k] === "number" ? +attrs[k].toFixed(2) : attrs[k]); };
  const op = (el, v) => { el.style.opacity = +clamp01(v).toFixed(3); };
  // camera keys: [p, center x, center y, view width]; the height keeps the 440:240 frame
  const CAM = [[0, 300, 92, 150], [0.07, 300, 180, 330], [0.27, 300, 180, 296], [0.33, 300, 180, 330], [0.44, 300, 180, 440], [0.66, 300, 180, 440], [0.8, 300, 180, 410], [0.92, 300, 180, 380], [1, 300, 180, 350]];
  // phones (a tall drawing box, so the frame is width-bound): a wider shot from the moment the row appears, so the
  // row's ends are never cut at the screen's sides, and no sideways drift
  const CAM_NARROW = [[0, 300, 92, 150], [0.07, 300, 180, 330], [0.28, 300, 180, 296], [0.36, 300, 180, 470], [0.66, 300, 180, 470], [0.8, 300, 180, 440], [0.92, 300, 180, 400], [1, 300, 180, 380]];
  let narrow = false;
  const camAt = (p) => {
    const K = narrow ? CAM_NARROW : CAM;
    let i = 0;
    while (i < K.length - 2 && p > K[i + 1][0]) i++;
    const [p0, x0, y0, w0] = K[i], [p1, x1, y1, w1] = K[i + 1];
    const t = io(seg(p, p0, p1));
    return [mix(x0, x1, t), mix(y0, y1, t), mix(w0, w1, t)];
  };
  let last = -1, lastO = -1, cur = -1, artW = 0, weaveOn = 0;
  const update = () => {
    const r = track.getBoundingClientRect();
    const vh = window.innerHeight;
    // lights: dim as the track comes up the screen, light up again as it leaves
    const o = Math.min(clamp01((vh - r.top) / (vh * 0.7)), clamp01((r.bottom - vh * 0.25) / (vh * 0.6)));
    if (Math.abs(o - lastO) > 0.001) {
      lastO = o;
      hj.style.setProperty("--hj-o", o.toFixed(3));
      op(weave, weaveOn * clamp01((o - 0.85) / 0.15)); // the weave's dark gaps would show as marks while the lights come up
    }
    const span = r.height - vh;
    const p = clamp01(-r.top / (span > 0 ? span : 1));
    if (Math.abs(p - last) < 0.0003) return;
    last = p;
    bar.style.setProperty("--p", p.toFixed(4));
    // 1. trace
    const a = io(seg(p, 0.02, 0.28));
    trace.style.strokeDashoffset = (1 - a).toFixed(4);
    glow.style.strokeDashoffset = (0.12 - a).toFixed(4); // a short glowing tail behind the pen
    const ang = a * Math.PI * 2; // counterclockwise from the top, so it sets off leftwards (RTL)
    set(pen, { cx: C - R * Math.sin(ang), cy: CY - R * Math.cos(ang) });
    const leave1 = seg(p, 0.29, 0.34);
    op(trace, a >= 1 ? 0 : 1);
    op(glow, a > 0 && a < 1 ? 1 : 0);
    op(dash, 1 - leave1);
    op(start, 1 - leave1);
    op(pen, 1 - leave1);
    const tA = seg(p, 0.275, 0.37);
    set(pulseA, { r: R + 80 * out(tA) });
    op(pulseA, tA > 0 && tA < 1 ? 0.7 * (1 - tA) : 0);
    // the project circle takes over from the finished trace and shrinks into step 1
    const shrink = io(seg(p, 0.30, 0.42));
    let px = mix(C, STEPS[0], shrink), pr = mix(R, SR, shrink);
    // 2. along the row: q runs 0..3 (step 1 → 4); each move holds a little at both ends
    const q = seg(p, 0.42, 0.66) * 3;
    const k = Math.min(2, Math.floor(q));
    const f = io(clamp01((q - k - 0.15) / 0.7));
    if (p >= 0.42) px = mix(STEPS[k], STEPS[k + 1], q >= 3 ? 1 : f);
    const rowOut = seg(p, 0.66, 0.74);
    dones.forEach((d, i) => op(d, 0.5 * clamp01((q - i - 0.25) / 0.35) * (1 - rowOut)));
    let pulse = null;
    for (let i = 0; i < 3; i++) { const t = (q - i - 0.25) / 0.6; if (t > 0 && t < 1) pulse = [i, t]; }
    if (pulse) { set(pulseS, { cx: STEPS[pulse[0]], r: SR + 34 * out(pulse[1]) }); op(pulseS, 0.6 * (1 - pulse[1])); } else op(pulseS, 0);
    rows.forEach((el) => op(el, seg(p, 0.31, 0.40) * (1 - rowOut)));
    op(ring, seg(p, 0.40, 0.44) * (1 - seg(p, 0.64, 0.68)));
    // 3. leave the row and grow; the partner ring slides in and links
    const grow = io(seg(p, 0.68, 0.80));
    if (p >= 0.68) { px = mix(STEPS[3], 260, grow); pr = mix(SR, 80, grow); }
    set(proj, { cx: px, r: pr });
    set(ring, { cx: px });
    op(proj, a >= 1 ? 1 : 0);
    const slide = out(seg(p, 0.78, 0.92));
    set(partner, { cx: mix(600, 340, slide) });
    op(partner, seg(p, 0.78, 0.86));
    weaveOn = seg(p, 0.905, 0.93);
    op(weave, weaveOn * clamp01((lastO - 0.85) / 0.15));
    const tL = seg(p, 0.915, 1);
    set(pulseL, { r: 124 + 110 * out(tL) });
    op(pulseL, tL > 0 && tL < 1 ? 0.6 * (1 - tL) : 0);
    // camera: follows the circle a little along the row
    let [cx, cy, w] = camAt(p);
    if (!narrow && p > 0.40 && p < 0.72) cx += (px - C) * 0.3 * Math.min(seg(p, 0.40, 0.46), 1 - seg(p, 0.66, 0.72));
    const h = (w * 240) / 440;
    art.setAttribute("viewBox", `${(cx - w / 2).toFixed(2)} ${(cy - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
    if (artW) { trace.style.strokeWidth = ((4 * w) / artW).toFixed(3); glow.style.strokeWidth = ((16 * w) / artW).toFixed(3); }
    // text
    const n = p < 0.36 ? 0 : p < 0.73 ? 1 : 2;
    if (n !== cur) {
      cur = n;
      steps.forEach((s, i) => { s.classList.toggle("is-on", i === n); s.classList.toggle("is-past", i < n); });
      count.textContent = `0${n + 1}`;
    }
  };
  const measure = () => { const b = art.getBoundingClientRect(); artW = b.width; narrow = b.height / b.width > 0.6; last = -1; update(); };
  measure();
  if (window.lenis) window.lenis.on("scroll", update);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", measure);
}

// About: parallax portrait (2026-10-06, user; made stronger "like a reveal" the same day). The photo sits enlarged
// inside a clipping window in its frame and drifts against the scroll: from 12% of the window lower than center
// when the frame enters at the bottom of the screen to 12% higher as it leaves at the top, so it moves more slowly
// than the frame around it. On the way in it also zooms out (1.5 → 1.26 by the time the frame's middle reaches the
// middle of the screen), so the photo opens up as it arrives. Measured from the frame's live box, so it also
// follows the frame's own rise in the pinned reveal.
const arPhoto = document.querySelector(".v2 .ar-photo");
if (arPhoto && !reduceMotion) {
  const img = arPhoto.querySelector("img");
  const clip = document.createElement("span");
  clip.className = "ar-photo-clip";
  img.replaceWith(clip);
  clip.append(img);
  arPhoto.classList.add("is-parallax");
  const RANGE = 0.12;
  const BASE = 1.26;  // covers the ±12% drift
  const ZOOM = 0.24;  // extra scale while the frame comes in
  let last = null;
  const update = () => {
    const r = clip.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom < -50 || r.top > vh + 50) return; // off screen
    const t = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
    const py = Math.round(t * RANGE * r.height * 10) / 10;
    const k = Math.max(0, t);
    const ps = Math.round((BASE + ZOOM * k * k) * 1000) / 1000; // eases into its resting size
    const key = py + "|" + ps;
    if (key === last) return;
    last = key;
    img.style.setProperty("--py", `${py}px`);
    img.style.setProperty("--ps", ps);
  };
  update();
  if (window.lenis) window.lenis.on("scroll", update);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

// About: fill text on scroll. Words go from gray to white as the block moves up the screen.
const fillBlocks = document.querySelectorAll(".fill-text");
if (fillBlocks.length) {
  const words = [];
  fillBlocks.forEach((p) => {
    const parts = p.textContent.trim().split(/(\s+)/);
    p.textContent = "";
    parts.forEach((part) => {
      if (/^\s+$/.test(part)) { p.appendChild(document.createTextNode(" ")); return; }
      const w = document.createElement("span");
      w.className = "w";
      w.textContent = part;
      p.appendChild(w);
      words.push(w);
    });
  });
  if (reduceMotion) {
    words.forEach((w) => w.classList.add("is-lit"));
  } else {
    const container = fillBlocks[0].parentElement;
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = container.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the text's top reaches 85% of the screen, 1 when its bottom reaches 45%
      const start = vh * 0.85, end = vh * 0.45;
      const progress = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height)));
      const lit = Math.round(progress * words.length);
      words.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
    };
    const onFillScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onFillScroll, { passive: true });
    window.addEventListener("resize", onFillScroll);
    update();
  }
}

// Process: one step open at a time. With a mouse, hovering a row opens it and it stays open
// after the pointer leaves (like the reference); on touch, tapping opens it. First step starts open.
const steps = [...document.querySelectorAll(".step")];
const openStep = (step) => {
  steps.forEach((s) => {
    const on = s === step;
    s.classList.toggle("is-open", on);
    s.querySelector(".step-head").setAttribute("aria-expanded", String(on));
  });
};
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
steps.forEach((step) => {
  step.querySelector(".step-head").addEventListener("click", () => openStep(step));
  if (canHover) step.addEventListener("mouseenter", () => openStep(step));
});

// Process cards (how-test.html): every card sticks at the same spot. p[i] is how far card i+1 has slid over
// card i (0 → 1); --d on a card is how many cards cover it (the sum of p from it on), which CSS turns into
// rise, shrink and shade. Computed from the stick position and the cards' (equal) height, not from the covered
// card's own box, which its transform moves. Updated on Lenis's own scroll event too, so it moves with the scroll
const pcCards = [...document.querySelectorAll(".pc-card")];
if (pcCards.length > 1 && !reduceMotion) {
  const updatePc = () => {
    const stickAt = parseFloat(getComputedStyle(pcCards[0]).top);
    const h = pcCards[0].offsetHeight;
    const p = pcCards.map((c, i) => {
      const next = pcCards[i + 1];
      if (!next) return 0;
      return Math.min(1, Math.max(0, (stickAt + h - next.getBoundingClientRect().top) / Math.max(1, h)));
    });
    let d = 0;
    for (let i = pcCards.length - 1; i >= 0; i--) {
      d += p[i];
      pcCards[i].style.setProperty("--d", d.toFixed(3));
    }
  };
  window.addEventListener("scroll", updatePc, { passive: true });
  window.addEventListener("resize", updatePc);
  if (window.lenis) window.lenis.on("scroll", updatePc);
  updatePc();
}
// Folder tabs: a card must be at its place before the next one shows, so the gap between cards is set so the
// next card's tab is still below the screen when this card reaches its stick position (from layoutVh, so the
// phone address bar can't change the page height mid-scroll)
const pcFolder = document.querySelector(".pc-folder .pc-list");
let pcPin = null;
if (pcFolder && pcCards.length > 1 && !reduceMotion) {
  const gapPc = () => {
    const cs = getComputedStyle(pcFolder);
    const tab = parseFloat(cs.getPropertyValue("--tab")) || 0;
    const h = pcCards[0].offsetHeight;
    // the stack (tabs + card) pins centered in the space under the header (which comes back on scroll up), so
    // the header never covers the tabs; the bottom blur slides away while the stack is pinned (see the header's
    // scroll handler). If the stack doesn't fit under the header, its bottom edge sits 12px above the screen's
    const hdr = (document.querySelector(".header-inner")?.offsetHeight || 40) + 25; // the scrolled header's height
    const block = h + tab;
    const top = block <= layoutVh - hdr - 24
      ? hdr + Math.round((layoutVh - hdr - block) / 2)
      : Math.max(12, layoutVh - 12 - block);
    const stickAt = top + tab;
    pcPin = { stick: stickAt, h };
    pcFolder.style.setProperty("--stick", `${stickAt}px`);
    pcFolder.style.setProperty("--pc-gap", `${Math.max(tab + 48, Math.ceil(layoutVh - stickAt - h + tab + 24))}px`);
  };
  window.addEventListener("resize", gapPc);
  if (document.fonts) document.fonts.ready.then(gapPc);
  gapPc();
}

// How I work (how-test.html): play each card's drawing when it comes into view; replay it on hover
const artCards = document.querySelectorAll(".how3-card");
if (artCards.length) {
  const artIo = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("art-on"); artIo.unobserve(e.target); }
  }), { threshold: 0.45 });
  artCards.forEach((card) => {
    artIo.observe(card);
    if (canHover) card.addEventListener("mouseenter", () => {
      if (!card.classList.contains("art-on")) return;
      card.classList.add("art-reset");
      card.classList.remove("art-on");
      void card.offsetWidth; // apply the start state before playing again
      card.classList.remove("art-reset");
      card.classList.add("art-on");
    });
  });
}

// Testimonials, one quote at a time (how-test.html): the arrows cycle through the quotes
const qtItems = [...document.querySelectorAll(".qt-item")];
if (qtItems.length) {
  let qtIndex = 0;
  const showQt = (i) => {
    qtIndex = (i + qtItems.length) % qtItems.length;
    qtItems.forEach((item, k) => {
      item.classList.toggle("is-active", k === qtIndex);
      item.toggleAttribute("aria-hidden", k !== qtIndex);
    });
  };
  document.querySelector(".qt-prev").addEventListener("click", () => showQt(qtIndex - 1));
  document.querySelector(".qt-next").addEventListener("click", () => showQt(qtIndex + 1));
}

// Decorations (how-test.html): play once when their section comes into view
const decos = document.querySelectorAll(".deco");
if (decos.length && "IntersectionObserver" in window) {
  const decoIo = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const deco = e.target.querySelector(".deco");
    deco?.classList.add("deco-on");
    decoIo.unobserve(e.target);
  }), { threshold: 0.35 });
  decos.forEach((d) => decoIo.observe(d.parentElement));
} else decos.forEach((d) => d.classList.add("deco-on"));

// Final CTA (how-test.html): an image trail rebuilt frame by frame from the user's recording of the reference.
// - A new image each time the mouse has moved STEP px since the last one (checked once a frame). Slow moves
//   show one image at a time (each one is gone before the next is due); fast moves add one a frame, and the
//   faster the move, the wider the gap. Standing still adds nothing.
// - Each image starts at the previous image's spot and glides to the cursor (the smooth feel), pops in,
//   holds, then shrinks and fades in place. No tilt; the newest is on top.
// Only with a mouse and without reduced motion; otherwise the still fan in the corner stays. Every image is
// decoded up front and a fixed pool is reused. The button stays clear: nothing appears near it, and the
// images never take pointer events.
const ctaPanel = document.querySelector(".cta-panel");
const trail = ctaPanel?.querySelector(".cta-trail");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (trail && finePointer && !calm) {
  ctaPanel.classList.add("cta-trail-on");
  const srcs = [...new Set([...document.querySelectorAll(".wall img")].map((img) => img.getAttribute("src")))];
  srcs.forEach((src) => { const im = new Image(); im.src = src; im.decode?.().catch(() => {}); }); // warm the cache
  const STEP = 90;      // px of mouse travel per image
  const GLIDE = 900;    // ms for an image to glide from the previous spot to the cursor
  const LIFE = 750;     // ms from appearing to gone
  const POOL = 26;      // enough for about a second of one-per-frame spawning
  const pool = Array.from({ length: POOL }, () => {
    const item = document.createElement("div");
    item.className = "ti";
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    item.appendChild(img);
    trail.appendChild(item);
    return item;
  });
  const cta = ctaPanel.querySelector(".btn-primary");
  let size = null, next = 0, slot = 0, mouse = null, lastSpawn = null, running = false;
  const measure = () => { size = { w: pool[0].offsetWidth || 130, h: pool[0].offsetHeight || 160 }; };
  const nearButton = (x, y) => {
    if (!cta) return false;
    const b = cta.getBoundingClientRect(), r = ctaPanel.getBoundingClientRect(), pad = 60;
    return x > b.left - r.left - pad && x < b.right - r.left + pad && y > b.top - r.top - pad && y < b.bottom - r.top + pad;
  };
  const at = (p) => `translate3d(${(p.x - size.w / 2).toFixed(1)}px, ${(p.y - size.h / 2).toFixed(1)}px, 0)`;
  const spawn = (from, to) => {
    const item = pool[slot++ % POOL];
    const img = item.firstElementChild;
    item.getAnimations().forEach((a) => a.cancel());
    img.getAnimations().forEach((a) => a.cancel());
    img.src = srcs[next++ % srcs.length];
    trail.appendChild(item); // newest on top
    item.animate([{ transform: at(from) }, { transform: at(to) }],
      { duration: GLIDE, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" });
    img.animate(
      [
        { transform: "scale(0.8)", opacity: 0 },
        { transform: "scale(1)", opacity: 1, offset: 0.12 },
        { transform: "scale(1)", opacity: 1, offset: 0.55 },
        { transform: "scale(0.2)", opacity: 0 },
      ],
      { duration: LIFE, easing: "ease-in-out", fill: "forwards" }
    );
  };
  const frame = () => {
    if (!mouse) { running = false; return; }
    if (!lastSpawn) lastSpawn = { ...mouse };
    if (Math.hypot(mouse.x - lastSpawn.x, mouse.y - lastSpawn.y) >= STEP) {
      if (!nearButton(mouse.x, mouse.y)) spawn(lastSpawn, mouse);
      lastSpawn = { ...mouse };
    }
    requestAnimationFrame(frame);
  };
  ctaPanel.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (!size) measure();
    const r = ctaPanel.getBoundingClientRect();
    mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (!running) { running = true; requestAnimationFrame(frame); }
  }, { passive: true });
  ctaPanel.addEventListener("pointerleave", () => { mouse = lastSpawn = null; });
  window.addEventListener("resize", () => { size = null; });
}

// Sticky header background
const header = document.querySelector(".site-header");
// Light hero: dark header while it sits over the hero, and no dark blur tint over it
const hero = document.querySelector(".hero");
const blur = document.querySelector(".bottom-blur");
const footer = document.querySelector(".site-footer");
// Hide on scroll down, show on scroll up (user, 2026-10-05). Always shown near the top, while the phone menu is
// open and while focus is inside it (keyboard users). A few pixels of slack so tiny jitters don't toggle it
let lastY = window.scrollY;
const toTop = document.querySelector(".to-top");
let toTopBusy = false; // while its own scroll runs, it stays hidden
if (toTop) {
  toTop.addEventListener("click", () => {
    if (window.lenis && !reduceMotion) window.lenis.scrollTo(0, { duration: 1.4 });
    else window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    toTopBusy = true;
    toTop.classList.remove("is-shown");
    document.querySelector(".logo")?.focus({ preventScroll: true }); // keyboard users land at the top too
  });
}
const onScroll = () => {
  const y = window.scrollY;
  header.classList.toggle("is-scrolled", y > 24);
  if (Math.abs(y - lastY) > 6) {
    const hide = y > lastY && y > 160 && !header.querySelector(":focus-visible") && !document.querySelector(".main-nav.is-open");
    header.classList.toggle("is-hidden", hide);
    lastY = y;
  }
  const heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
  header.classList.toggle("on-light", heroBottom > header.offsetHeight / 2);
  blur?.classList.toggle("on-light", heroBottom > window.innerHeight - 20);
  // The footer pushes the bottom blur off the screen as it comes into view, so it never covers the footer.
  // (A slide, not a fade: opacity on the blur's parent would stop its backdrop-filter from blurring the page.)
  if (blur && footer) {
    const rise = window.innerHeight - footer.getBoundingClientRect().top; // how far the footer has come up
    let p = Math.min(1, Math.max(0, rise / Math.min(blur.offsetHeight, footer.offsetHeight))); // gone once the footer is fully in
    // The process folder stack also pushes it away while it's pinned, so the blur never covers a card's bottom
    // (user): it slides out over the last 200px before the first card pins and back as the stack leaves
    if (pcPin && pcFolder && pcFolder.isConnected) {
      const first = pcCards[0].getBoundingClientRect().top;
      const lastBottom = pcCards[pcCards.length - 1].getBoundingClientRect().bottom;
      const pIn = (pcPin.stick + 200 - first) / 200;
      const pOut = (lastBottom - (pcPin.stick + pcPin.h) + 200) / 200;
      p = Math.max(p, Math.min(1, Math.max(0, Math.min(pIn, pOut))));
    }
    // ...and so does the dark band of the How I work journey (?how=journey), from its arrival until it lights up again
    const hjTrack = document.querySelector(".hj:not([hidden]) .hj-track");
    if (hjTrack) {
      const r = hjTrack.getBoundingClientRect();
      p = Math.max(p, Math.min(1, Math.max(0, Math.min((window.innerHeight - r.top) / 200, (r.bottom - window.innerHeight * 0.4) / 200))));
    }
    blur.style.transform = p ? `translateY(${(p * 100).toFixed(1)}%)` : "";
  }
  // Back to top: shown only while scrolling up (the same moment the header comes back), past ~2 screens, and
  // not while the menu is open; it rides up above the footer as the footer comes in
  if (toTop) {
    if (y < layoutVh) toTopBusy = false;
    const show = !toTopBusy && y > layoutVh * 2 && !header.classList.contains("is-hidden") && !document.documentElement.classList.contains("menu-open");
    toTop.classList.toggle("is-shown", show);
    const lift = footer ? Math.max(0, window.innerHeight - footer.getBoundingClientRect().top) : 0;
    toTop.style.setProperty("--lift", `${Math.round(lift)}px`);
  }
};
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);

// Nav links and CTA buttons: split into letters for the hover roll (each letter stacked with a copy)
document.querySelectorAll(".main-nav a, .btn-primary").forEach((link) => {
  const text = link.textContent.trim();
  link.setAttribute("aria-label", text);
  const roll = document.createElement("span");
  roll.className = "roll";
  roll.setAttribute("aria-hidden", "true");
  [...text].forEach((ch, i) => {
    const col = document.createElement("span");
    col.className = "roll-char";
    col.style.setProperty("--i", i);
    col.innerHTML = "<span></span><span></span>";
    col.children[0].textContent = ch;
    col.children[1].textContent = ch;
    roll.appendChild(col);
  });
  link.textContent = "";
  link.appendChild(roll);
});

// Statement: title card (how-test.html / en.html). Each sentence is sized so its longest line spans ~98% of the
// container (capped by the screen height). With motion the section pins (sticky stage in a 240vh track):
// .st-on once its top is halfway up the screen (the first sentence rises in), the strike drawn with the scroll over
// 4–36% of the pin, .st-two at 48% (it falls back, and the second sentence rises in line by line from per-word masks). Both reverse.
const statement = document.querySelector(".statement-xl");
if (statement) {
  const s1 = statement.querySelector(".st-s1");
  const s2 = statement.querySelector(".st-s2");
  const fitStatement = () => {
    [s1, s2].forEach((s) => (s.style.fontSize = ""));
    if (matchMedia("(max-width: 600px)").matches) return;
    const box = statement.querySelector(".container");
    const cs = getComputedStyle(box);
    const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const maxH = layoutVh * 0.7;
    // offsetWidth/offsetHeight ignore the reveal's transforms; a second pass corrects any non-linear rounding
    const size = (s) => [Math.max(...[...s.querySelectorAll(".ln")].map((l) => l.offsetWidth)), s.offsetHeight];
    [s1, s2].forEach((s) => {
      let fs = 100;
      for (let i = 0; i < 2; i++) {
        s.style.fontSize = `${fs}px`;
        const [w, h] = size(s);
        fs = Math.min((fs * avail * 0.98) / w, (fs * maxH) / h);
      }
      s.style.fontSize = `${fs.toFixed(1)}px`;
    });
  };
  fitStatement();
  document.fonts?.ready.then(fitStatement);
  document.fonts?.addEventListener("loadingdone", fitStatement); // the web font arrives after the first fit
  window.addEventListener("resize", fitStatement);

  if (!reduceMotion) {
    // the second sentence: one mask per word, inside its line
    s2.querySelectorAll(".ln").forEach((ln) => {
      ln.innerHTML = ln.textContent.trim().split(/\s+/).map((w) => `<span class="st-w"><span class="st-wi">${w}</span></span>`).join(" ");
    });
    const words = [...s2.querySelectorAll(".st-w")];
    fitStatement(); // the word masks add a little width
    // the strike follows the scroll (user, 2026-10-05): over the first part of the pin it draws through the phrase
    // in proportion to how far you've scrolled, and scrolling back pulls it back, word by word. One bar per word,
    // each word's share of the stroke set by its width, so the line moves at one speed through the whole phrase
    statement.querySelectorAll(".st-strike").forEach((st) => {
      st.innerHTML = st.textContent.trim().split(/\s+/).map((w) => `<span class="st-sw">${w}</span>`).join(" ");
    });
    const strikeWords = [...statement.querySelectorAll(".st-sw")];
    let strikeWidths = [];
    const measureStrike = () => {
      // a word at the end of a line doesn't carry its bar on into the empty space
      // otherwise its bar runs on to the next word, measured, so the stroke has no breaks
      strikeWidths = strikeWords.map((w) => {
        const n = w.nextElementSibling;
        const eol = !n || n.offsetTop !== w.offsetTop;
        w.classList.toggle("st-eol", eol);
        // layout offsets, not getBoundingClientRect: the sentence is scaled and moved while it animates in,
        // and measuring through that transform made the gap too short, leaving a break in the bar (user)
        const aL = w.offsetLeft, aR = aL + w.offsetWidth;
        const bL = n ? n.offsetLeft : aL, bR = n ? bL + n.offsetWidth : aR;
        const gap = eol ? 0 : Math.max(0, bL > aR ? bL - aR : aL - bR);
        w.style.setProperty("--gap", `${gap.toFixed(2)}px`);
        return w.offsetWidth + gap;
      });
    };
    const drawStrike = (k) => {
      const total = strikeWidths.reduce((x, y) => x + y, 0);
      let left = k * total;
      strikeWords.forEach((w, i) => {
        const f = Math.min(1, Math.max(0, left / strikeWidths[i]));
        w.style.setProperty("--k", f.toFixed(4));
        left -= strikeWidths[i];
      });
    };
    const lineDelays = (base) => {
      const tops = [...new Set(words.map((w) => w.offsetTop))].sort((x, y) => x - y);
      words.forEach((w) => { w.firstChild.style.transitionDelay = base == null ? "0s" : `${base + tops.indexOf(w.offsetTop) * 0.13}s`; });
    };
    statement.classList.add("st-ready", "st-pin");
    const track = statement.querySelector(".st-track");
    let on = false, two = false;
    measureStrike();
    const updateStatement = () => {
      const r = track.getBoundingClientRect();
      const vh = innerHeight;
      const p = -r.top / Math.max(1, r.height - vh); // 0 → 1 through the pin
      const nowOn = r.top < vh * 0.5;
      const nowTwo = p > 0.48;
      drawStrike(Math.min(1, Math.max(0, (p - 0.04) / 0.32))); // drawn from 4% to 36% of the pin
      if (nowOn !== on) {
        on = nowOn;
        statement.classList.toggle("st-on", on);
      }
      if (nowTwo !== two) {
        two = nowTwo;
        lineDelays(two ? 0.25 : null);
        statement.classList.toggle("st-two", two);
      }
    };
    window.addEventListener("scroll", updateStatement, { passive: true });
    window.addEventListener("resize", () => { measureStrike(); updateStatement(); });
    document.fonts?.addEventListener("loadingdone", () => { measureStrike(); updateStatement(); });
    document.fonts?.ready.then(() => { measureStrike(); updateStatement(); });
    if (window.lenis) window.lenis.on("scroll", updateStatement);
    updateStatement();
  }
}

// Language switcher: keep the page's ?query (tone and other variants) when switching language
const syncLangLinks = () => document.querySelectorAll(".lang-switch a[href]").forEach((a) => {
  a.href = a.getAttribute("href").split("?")[0] + location.search;
});
syncLangLinks();

// Theme toggle (how-test.html / en.html): switches the page between the light cool slate (.tone-cool) and the dark
// monochrome (.tone-dark), remembers the choice (localStorage "uxk-theme", read by the inline head script before
// first paint, so there's no flash), and drops any ?tone= from the address so the choice carries to the other language
const themeBtn = document.querySelector(".theme-toggle");
if (themeBtn) {
  const root = document.documentElement;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const sync = () => {
    const dark = root.classList.contains("tone-dark");
    themeBtn.setAttribute("aria-pressed", String(dark));
    if (metaTheme) metaTheme.content = dark ? "#090c11" : "#edf0f4";
  };
  sync();
  themeBtn.addEventListener("click", () => {
    const dark = !root.classList.contains("tone-dark");
    root.classList.add("theme-switching", "toned");
    root.classList.remove("tone-warm");
    root.classList.toggle("tone-dark", dark);
    root.classList.toggle("tone-cool", !dark);
    try { localStorage.setItem("uxk-theme", dark ? "dark" : "light"); } catch (e) {}
    const url = new URL(location.href);
    if (url.searchParams.has("tone")) {
      url.searchParams.delete("tone");
      history.replaceState(null, "", url);
      syncLangLinks();
    }
    sync();
    setTimeout(() => root.classList.remove("theme-switching"), 500);
  });
}

// Mobile menu
const toggle = document.querySelector(".menu-toggle");
const nav = document.getElementById("main-nav");
// Full-screen version (how-test / en, body.v2): the nav moves out of the header, right after it (the scrolled
// header's backdrop-filter would make a fixed child size itself to the header), the links are numbered for the
// one-by-one fade, and while it's open the page can't scroll (Lenis stopped, html overflow hidden) and the
// page behind it is inert
const fullMenu = document.body.classList.contains("v2");
if (fullMenu) {
  header.after(nav);
  nav.querySelectorAll("li").forEach((li, i) => li.style.setProperty("--i", i));
}
// Closing plays the cascade in reverse (user, 2026-10-05): the links leave from the last to the first
// (.is-closing, each with --r = its place from the end), and only then does the overlay fade out and the page
// unlock. A menu link waits for that too: its click is held, and once the menu is closed it's clicked again so
// Lenis scrolls to the section as usual.
const CLOSE_STEP = 90;   // ms between links leaving (matches the CSS)
const CLOSE_LEAVE = 500; // ms each link takes to leave (matches the CSS)
let closeTimer = 0;
let passThrough = false;
const finishClose = () => {
  nav.classList.remove("is-open", "is-closing");
  document.documentElement.classList.remove("menu-open");
  if (window.lenis) window.lenis.start();
  document.querySelectorAll("main, .site-footer").forEach((el) => { el.inert = false; });
};
const setMenu = (open, after) => {
  const isOpen = nav.classList.contains("is-open") && !nav.classList.contains("is-closing");
  if (open === isOpen) return;
  toggle.setAttribute("aria-expanded", String(open));
  const en = document.documentElement.lang === "en";
  toggle.setAttribute("aria-label", open ? (en ? "Close menu" : "סגירת תפריט") : (en ? "Open menu" : "פתיחת תפריט"));
  if (!fullMenu) { nav.classList.toggle("is-open", open); return; }
  clearTimeout(closeTimer);
  header.classList.remove("is-hidden");
  if (open) {
    toTop?.classList.remove("is-shown");
    nav.classList.remove("is-closing");
    nav.classList.add("is-open");
    document.documentElement.classList.add("menu-open");
    if (window.lenis) window.lenis.stop();
    document.querySelectorAll("main, .site-footer").forEach((el) => { el.inert = true; });
    nav.querySelector("a")?.focus({ preventScroll: true });
    return;
  }
  if (nav.contains(document.activeElement)) toggle.focus({ preventScroll: true });
  const items = [...nav.querySelectorAll("li")].filter((li) => li.offsetParent !== null);
  items.forEach((li, i) => li.style.setProperty("--r", items.length - 1 - i));
  nav.classList.add("is-closing");
  const wait = reduceMotion ? 0 : CLOSE_STEP * (items.length - 1) + CLOSE_LEAVE;
  closeTimer = setTimeout(() => { finishClose(); if (after) after(); }, wait);
};
toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
nav.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a || passThrough) return;
  if (!fullMenu || a.target === "_blank") { setMenu(false); return; }
  e.preventDefault(); // close first, then follow the link
  setMenu(false, () => { passThrough = true; a.click(); passThrough = false; });
});
document.addEventListener("keydown", (e) => e.key === "Escape" && setMenu(false));

// Reveal on scroll
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 60}ms`;
    io.observe(el);
  });
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// Images: no right-click menu and no drag-out (user request). A deterrent only: anyone determined can
// still get the files through the browser's dev tools or a screenshot.
document.addEventListener("contextmenu", (e) => { if (e.target.closest("img, .shot")) e.preventDefault(); });
document.addEventListener("dragstart", (e) => { if (e.target.closest("img, .shot")) e.preventDefault(); });

const yearEl = document.getElementById("year"); // gone from the how-test / en footers (2026-10-06)
if (yearEl) yearEl.textContent = new Date().getFullYear();

// FAQ: smooth open and close (user: they opened and closed instantly). The <details> height animates
// between the question's height and the full height, and the answer fades and rises in. A click during an
// animation reverses it from where it is. Without JS or with reduced motion: the native instant toggle.
if (!reduceMotion) {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const summary = item.querySelector("summary");
    const answer = item.querySelector("summary + *");
    let anim = null;
    const DURATION = 450;
    const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
    const run = (from, to, opening) => {
      anim?.cancel();
      item.style.overflow = "hidden";
      anim = item.animate({ height: [`${from}px`, `${to}px`] }, { duration: DURATION, easing: EASE });
      answer?.animate(
        opening
          ? [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }]
          : [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-6px)" }],
        { duration: opening ? DURATION : DURATION * 0.6, easing: EASE, fill: "both" }
      );
      anim.onfinish = () => {
        anim = null;
        item.style.overflow = "";
        if (!opening) item.open = false;
        item.classList.remove("is-closing");
      };
    };
    summary.addEventListener("click", (e) => {
      e.preventDefault();
      const start = item.offsetHeight;
      if (!item.open || item.classList.contains("is-closing")) {
        // open (or re-open a closing item from its current height)
        item.classList.remove("is-closing");
        item.open = true;
        run(start, item.scrollHeight, true);
      } else {
        item.classList.add("is-closing");
        run(start, summary.offsetHeight, false);
      }
    });
  });
}
