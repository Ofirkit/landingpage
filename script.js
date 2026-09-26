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

// Headline: rotate the last word, letter by letter
const rotator = document.querySelector(".rotator");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

// Sticky header background
const header = document.querySelector(".site-header");
const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

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
