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

// Testimonials slider (how-test.html): the arrows scroll one card; each is disabled at its end
const tstTrack = document.querySelector(".tst-track");
if (tstTrack) {
  const prev = document.querySelector(".tst-prev");
  const next = document.querySelector(".tst-next");
  const sign = getComputedStyle(tstTrack).direction === "rtl" ? -1 : 1; // RTL scrolls toward negative
  const step = () => {
    const card = tstTrack.querySelector(".tst-card");
    return card.offsetWidth + parseFloat(getComputedStyle(tstTrack).columnGap || 0);
  };
  const updateTst = () => {
    const x = Math.abs(tstTrack.scrollLeft);
    const max = tstTrack.scrollWidth - tstTrack.clientWidth;
    prev.disabled = x < 4;
    next.disabled = x > max - 4;
  };
  prev.addEventListener("click", () => tstTrack.scrollBy({ left: -sign * step(), behavior: "smooth" }));
  next.addEventListener("click", () => tstTrack.scrollBy({ left: sign * step(), behavior: "smooth" }));
  tstTrack.addEventListener("scroll", updateTst, { passive: true });
  window.addEventListener("resize", updateTst);
  updateTst();
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
