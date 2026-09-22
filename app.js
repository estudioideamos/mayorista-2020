const menuButton = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector("#mobile-nav");
function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menú");
  mobileNav.hidden = true;
}
menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(expanded));
  menuButton.setAttribute(
    "aria-label",
    expanded ? "Cerrar menú" : "Abrir menú",
  );
  mobileNav.hidden = !expanded;
});
mobileNav
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileNav.hidden) {
    closeMenu();
    menuButton.focus();
  }
});
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
    button.firstElementChild.textContent = paused ? "▶" : "Ⅱ";
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
