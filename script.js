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

// Headline: rotate the last word
const rotator = document.querySelector(".rotator");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (rotator && !reduceMotion) {
  const words = rotator.dataset.words.split(",").map((w) => w.trim()).filter(Boolean);
  rotator.textContent = "";
  const spans = words.map((word, i) => {
    const span = document.createElement("span");
    span.className = "rotator-word" + (i === 0 ? " is-current" : "");
    span.textContent = word;
    rotator.appendChild(span);
    return span;
  });
  let index = 0;
  const fit = () => { rotator.style.width = `${spans[index].offsetWidth}px`; };
  fit();
  document.fonts?.ready.then(fit);
  window.addEventListener("resize", fit);

  setInterval(() => {
    if (document.hidden) return;
    const prev = spans[index];
    index = (index + 1) % spans.length;
    const next = spans[index];
    prev.classList.remove("is-current");
    prev.classList.add("is-leaving");
    next.classList.remove("is-leaving");
    next.classList.add("is-current");
    fit();
    setTimeout(() => prev.classList.remove("is-leaving"), 600);
  }, 2800);
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
