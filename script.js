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
  let D = 0, vh = 0, pinAt = 0, lead = 0, lastY = null, hide = 0;
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
    lower.style.transform = settle < 1 ? `translate3d(0, ${Math.round(hide * (1 - settle))}px, 0)` : "";
  };
  const measure = () => {
    vh = window.innerHeight;
    D = Math.round(vh * 1.8);
    const textMid = text.offsetTop + text.offsetHeight / 2;  // inside the stage
    const stickyTop = Math.max(90, Math.round(vh * PIN - textMid)); // the text's middle pins at PIN, clear of the header
    stage.style.top = `${stickyTop}px`;
    const pad = parseFloat(getComputedStyle(track).paddingTop);
    track.style.height = `${pad + stage.offsetHeight + D}px`; // the stage's height plus D of pinned scrolling
    const stageDocTop = track.getBoundingClientRect().top + window.scrollY + pad;
    pinAt = stageDocTop - stickyTop;
    // how far below its resting place the photo waits so that it is just out of sight while pinned
    hide = Math.max(0, Math.round(vh + 2 - (stickyTop + lower.offsetTop)));
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
const onScroll = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
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

// Mobile menu
const toggle = document.querySelector(".menu-toggle");
const nav = document.getElementById("main-nav");
const setMenu = (open) => {
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "סגירת תפריט" : "פתיחת תפריט");
  nav.classList.toggle("is-open", open);
};
toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
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
