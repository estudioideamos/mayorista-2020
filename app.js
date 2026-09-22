const menuButton = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector("#mobile-nav");
const menuBackground = new Map();
function sizeMobileMenu() {
  mobileNav.style.setProperty(
    "--mobile-nav-top",
    `${document.querySelector(".header").getBoundingClientRect().bottom}px`,
  );
}
function closeMenu() {
  const wasOpen = !mobileNav.hidden;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menú");
  mobileNav.hidden = true;
  document.body.classList.remove("menu-open");
  if (wasOpen) document.body.style.overflow = "";
  menuBackground.forEach((inert, element) => {
    element.inert = inert;
  });
  menuBackground.clear();
}
menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") !== "true";
  if (!expanded) {
    closeMenu();
    return;
  }
  menuButton.setAttribute("aria-expanded", String(expanded));
  menuButton.setAttribute(
    "aria-label",
    expanded ? "Cerrar menú" : "Abrir menú",
  );
  mobileNav.hidden = !expanded;
  sizeMobileMenu();
  document.body.classList.add("menu-open");
  document.body.style.overflow = "hidden";
  document
    .querySelectorAll(
      "main, .footer, .floating-contact, .back-top, .header > .brand, .header > .header-cta",
    )
    .forEach((element) => {
      menuBackground.set(element, element.inert);
      element.inert = true;
    });
});
mobileNav
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (!mobileNav.hidden && event.key === "Tab") {
    const last = [...mobileNav.querySelectorAll("a")].at(-1);
    if (event.shiftKey && document.activeElement === menuButton) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      menuButton.focus();
    }
  }
  if (event.key === "Escape" && !mobileNav.hidden) {
    closeMenu();
    menuButton.focus();
  }
});
addEventListener(
  "resize",
  () => {
    if (!mobileNav.hidden) sizeMobileMenu();
  },
  { passive: true },
);
matchMedia("(min-width: 761px)").addEventListener("change", closeMenu);
const dialog = document.querySelector(".contact-dialog");
document.querySelectorAll("[data-contact]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (typeof dialog.showModal !== "function") return;
    event.preventDefault();
    closeMenu();
    dialog.showModal();
    document.body.style.overflow = "hidden";
  });
});
dialog
  .querySelector(".dialog-close")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    dialog.close();
});
dialog.addEventListener("close", () => {
  document.body.style.overflow = "";
});
document.querySelector("#year").textContent = new Date().getFullYear();
// Equal-width copies make each marquee loop seamlessly without duplicate screen-reader text.
document.querySelectorAll(".marquee-track").forEach((track) => {
  if (track.closest(".announcement")) {
    const group = track.firstElementChild;
    const repeats = Math.max(
      2,
      Math.ceil(screen.width / Math.max(1, group.scrollWidth)) + 1,
    );
    const items = [...group.children];
    for (let i = 1; i < repeats; i++)
      items.forEach((item) => {
        const repeated = item.cloneNode(true);
        repeated.setAttribute("aria-hidden", "true");
        group.append(repeated);
      });
  }
  const copy = track.firstElementChild.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
  track.append(copy);
});
document.querySelectorAll(".motion-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const paused = document.documentElement.classList.toggle("motion-paused");
    button.setAttribute("aria-pressed", String(paused));
    button.setAttribute(
      "aria-label",
      paused ? "Reanudar animaciones" : "Pausar animaciones",
    );
  });
});
if (
  !matchMedia("(prefers-reduced-motion: reduce)").matches &&
  "IntersectionObserver" in window
) {
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal");
          observer.unobserve(entry.target);
        }
      }),
    { threshold: 0.1 },
  );
  document
    .querySelectorAll(
      ".section-heading, .purchase-card, .products-copy, .branch, .closing-inner",
    )
    .forEach((element) => observer.observe(element));
}

// Native disclosures remain usable with keyboard and without JavaScript.
const footerMobile = matchMedia("(max-width: 760px)");
const footerDisclosures = document.querySelectorAll(".footer-disclosure");
function syncFooterDisclosures() {
  footerDisclosures.forEach((details) => {
    details.open = !footerMobile.matches;
    details.querySelector("summary").tabIndex = footerMobile.matches ? 0 : -1;
  });
}
footerDisclosures.forEach((details) => {
  details.querySelector("summary").addEventListener("click", (event) => {
    if (!footerMobile.matches) event.preventDefault();
  });
});
footerMobile.addEventListener("change", syncFooterDisclosures);
syncFooterDisclosures();
