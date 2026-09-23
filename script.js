// Contact links — replace with your real booking / WhatsApp URLs.
// Example: booking: "https://cal.com/your-name", whatsapp: "https://wa.me/9725XXXXXXXX"
const LINKS = {
  booking: "",
  whatsapp: "",
};


Object.entries(LINKS).forEach(([key, url]) => {
  if (!url) return;
  document.querySelectorAll(`[data-link="${key}"]`).forEach((el) => (el.href = url));
});

// Work gallery: duplicate each track once so the marquee loops seamlessly
document.querySelectorAll(".gallery-track").forEach((track) => {
  [...track.children].forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });
});

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
    el.style.transitionDelay = `${(i % 3) * 80}ms`;
    io.observe(el);
  });
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// Mobile sticky CTA: show after the hero, hide while the contact section is on screen
const mobileCta = document.querySelector(".mobile-cta");
const hero = document.querySelector(".hero");
const contact = document.getElementById("contact");
if (mobileCta && "IntersectionObserver" in window) {
  let heroVisible = true;
  let contactVisible = false;
  const update = () => mobileCta.classList.toggle("is-visible", !heroVisible && !contactVisible);
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; update(); }).observe(hero);
  new IntersectionObserver(([e]) => { contactVisible = e.isIntersecting; update(); }).observe(contact);
}

document.getElementById("year").textContent = new Date().getFullYear();
