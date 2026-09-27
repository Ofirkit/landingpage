// Work gallery: duplicate each track once so the marquee loops seamlessly
document.querySelectorAll(".gallery-track").forEach((track) => {
  [...track.children].forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.removeAttribute("role");
    clone.removeAttribute("aria-label");
    track.appendChild(clone);
  });
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Gallery videos: play only while on screen (saves CPU/battery, esp. with the cloned copy);
// with reduced motion they stay on their poster frame
const galleryVideos = document.querySelectorAll(".gallery video");
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

// Sticky header background
const header = document.querySelector(".site-header");
const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
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

document.getElementById("year").textContent = new Date().getFullYear();
