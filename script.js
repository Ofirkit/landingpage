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
  const parts = text.textContent.trim().split(/(\s+)/);
  text.textContent = "";
  parts.forEach((part) => {
    if (/^\s+$/.test(part)) { text.append(part); return; }
    const w = document.createElement("span");
    w.className = "w";
    w.textContent = part;
    text.append(w);
    words.push(w);
  });
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
if (pcFolder && pcCards.length > 1 && !reduceMotion) {
  const gapPc = () => {
    const cs = getComputedStyle(pcFolder);
    const tab = parseFloat(cs.getPropertyValue("--tab")) || 0;
    const stickAt = parseFloat(getComputedStyle(pcCards[0]).top);
    const h = pcCards[0].offsetHeight;
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
    const p = Math.min(1, Math.max(0, rise / Math.min(blur.offsetHeight, footer.offsetHeight))); // gone once the footer is fully in
    blur.style.transform = p ? `translateY(${(p * 100).toFixed(1)}%)` : "";
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
        const a = w.getBoundingClientRect(), b = n ? n.getBoundingClientRect() : a;
        const gap = eol ? 0 : Math.max(0, b.left > a.right ? b.left - a.right : a.left - b.right);
        w.style.setProperty("--gap", `${gap.toFixed(1)}px`);
        return a.width + gap;
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
const setMenu = (open) => {
  toggle.setAttribute("aria-expanded", String(open));
  const en = document.documentElement.lang === "en";
  toggle.setAttribute("aria-label", open ? (en ? "Close menu" : "סגירת תפריט") : (en ? "Open menu" : "פתיחת תפריט"));
  nav.classList.toggle("is-open", open);
};
toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
nav.addEventListener("click", (e) => e.target.closest("a") && setMenu(false));
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

document.getElementById("year").textContent = new Date().getFullYear();

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
