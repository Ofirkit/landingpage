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

// Headline: rotate the last word, letter by letter
const rotator = document.querySelector(".rotator");
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
      c.textContent = ch;
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

// Final CTA (how-test.html): wall screenshots trail the mouse and fade away. Only with a mouse and
// without reduced motion; otherwise the still fan in the corner stays.
// Feel (user request): the trail follows a smoothed copy of the cursor (it glides, it doesn't snap), and it
// reacts to speed: moving slowly adds nothing after the first image; faster moves add images, and the
// faster the move, the wider the gap between them. Each image drifts on a little in the direction of travel
// while it fades. Every image is decoded up front and a fixed pool of <img> elements is reused.
// The button stays clear: images never appear near it, and they never take pointer events.
const ctaPanel = document.querySelector(".cta-panel");
const trail = ctaPanel?.querySelector(".cta-trail");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (trail && finePointer && !calm) {
  ctaPanel.classList.add("cta-trail-on");
  const srcs = [...new Set([...document.querySelectorAll(".wall img")].map((img) => img.getAttribute("src")))];
  srcs.forEach((src) => { const im = new Image(); im.src = src; im.decode?.().catch(() => {}); }); // warm the cache
  const EASE = 0.14;       // how quickly the smoothed point catches up with the cursor (per frame at 60fps)
  const MIN_SPEED = 380;   // px/s: slower than this adds no new images (a relaxed move is ~200-300)
  const GAP_PER_SPEED = 0.12; // gap = speed × this, so faster moves spread the images out
  const MIN_GAP = 90, MAX_GAP = 300;
  const POOL = 12;
  const pool = Array.from({ length: POOL }, () => {
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    trail.appendChild(img);
    return img;
  });
  const cta = ctaPanel.querySelector(".btn-primary");
  let size = null, next = 0, slot = 0, cursor = null, pos = null, lastSpawn = null, speed = 0, last = 0, running = false;
  const measure = () => { size = { w: pool[0].offsetWidth || 180, h: pool[0].offsetHeight || 135 }; };
  const nearButton = (x, y) => {
    if (!cta) return false;
    const b = cta.getBoundingClientRect(), r = ctaPanel.getBoundingClientRect(), pad = 60;
    return x > b.left - r.left - pad && x < b.right - r.left + pad && y > b.top - r.top - pad && y < b.bottom - r.top + pad;
  };
  const spawn = (x, y, vx, vy) => {
    if (nearButton(x, y)) return;
    const img = pool[slot++ % POOL];
    img.getAnimations().forEach((a) => a.cancel());
    img.src = srcs[next++ % srcs.length];
    const rot = Math.random() * 10 - 5;
    const drift = Math.min(1, speed / 1500) * 60; // faster moves carry the image a little further
    const [dx, dy] = [vx * drift, vy * drift];
    const place = (ox, oy, s, r) => `translate3d(${(x - size.w / 2 + ox).toFixed(1)}px, ${(y - size.h / 2 + oy).toFixed(1)}px, 0) rotate(${r.toFixed(1)}deg) scale(${s})`;
    trail.appendChild(img); // newest on top
    img.animate(
      [
        { transform: place(0, 0, 0.82, rot), opacity: 0 },
        { transform: place(dx * 0.35, dy * 0.35, 1, rot), opacity: 1, offset: 0.22 },
        { transform: place(dx * 0.75, dy * 0.75, 1, rot * 0.8), opacity: 1, offset: 0.6 },
        { transform: place(dx, dy, 0.9, rot * 0.6), opacity: 0 },
      ],
      { duration: 1600, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
    );
  };
  const frame = (t) => {
    if (!cursor) { running = false; return; }
    const dt = Math.min(64, t - (last || t)) || 16.7;
    last = t;
    const k = 1 - Math.pow(1 - EASE, dt / 16.7); // frame-rate independent easing
    const px = pos.x, py = pos.y;
    pos = { x: pos.x + (cursor.x - pos.x) * k, y: pos.y + (cursor.y - pos.y) * k };
    const step = Math.hypot(pos.x - px, pos.y - py);
    speed = speed * 0.85 + (step / dt) * 1000 * 0.15; // smoothed px/s
    const gap = Math.min(MAX_GAP, Math.max(MIN_GAP, speed * GAP_PER_SPEED));
    const d = Math.hypot(pos.x - lastSpawn.x, pos.y - lastSpawn.y);
    if (speed > MIN_SPEED && d >= gap) {
      spawn(pos.x, pos.y, (pos.x - lastSpawn.x) / d, (pos.y - lastSpawn.y) / d);
      lastSpawn = { ...pos };
    }
    requestAnimationFrame(frame);
  };
  ctaPanel.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (!size) measure();
    const r = ctaPanel.getBoundingClientRect();
    cursor = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (!pos) { // entering: one image right away, then speed decides
      pos = { ...cursor }; lastSpawn = { ...cursor }; speed = 0;
      spawn(pos.x, pos.y, 0, 0);
    }
    if (!running) { running = true; last = 0; requestAnimationFrame(frame); }
  }, { passive: true });
  ctaPanel.addEventListener("pointerleave", () => { cursor = pos = lastSpawn = null; });
  window.addEventListener("resize", () => { size = null; });
}

// Sticky header background
const header = document.querySelector(".site-header");
// Light hero: dark header while it sits over the hero, and no dark blur tint over it
const hero = document.querySelector(".hero");
const blur = document.querySelector(".bottom-blur");
const onScroll = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
  const heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
  header.classList.toggle("on-light", heroBottom > header.offsetHeight / 2);
  blur?.classList.toggle("on-light", heroBottom > window.innerHeight - 20);
};
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

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
