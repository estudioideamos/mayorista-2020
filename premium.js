(() => {
  const root = document.documentElement;
  const header = document.querySelector(".header");
  const back = document.querySelector(".back-top");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const careersIntro = document.querySelector(".contact-main .contact-intro");
  if (careersIntro) {
    const sizeSticky = () =>
      careersIntro.style.setProperty(
        "--careers-sticky-top",
        `${Math.min(header.offsetHeight + 24, innerHeight - careersIntro.offsetHeight - 24)}px`,
      );
    if ("ResizeObserver" in window)
      new ResizeObserver(sizeSticky).observe(careersIntro);
    addEventListener("resize", sizeSticky, { passive: true });
    sizeSticky();
  }
  let scheduled = false;
  function update() {
    const range = root.scrollHeight - innerHeight;
    header.style.setProperty(
      "--progress",
      range > 0 ? Math.min(1, scrollY / range) : 0,
    );
    header.classList.toggle("is-scrolled", scrollY > 30);
    back.hidden = scrollY < 650;
    scheduled = false;
  }
  addEventListener(
    "scroll",
    () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  addEventListener("resize", update, { passive: true });
  update();
  const credit = document.querySelector(".developer-credit");
  if (credit && "IntersectionObserver" in window) {
    const footerObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries[0].isIntersecting;
        document
          .querySelectorAll(".floating-contact, .back-top")
          .forEach((control) => {
            control.classList.toggle("footer-visible", visible);
            control.inert = visible;
          });
      },
      { rootMargin: "0px 0px 50px 0px", threshold: 0 },
    );
    footerObserver.observe(credit);
  }
  back.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: reduced.matches ? "instant" : "smooth",
    });
    document.querySelector(".header .brand").focus({ preventScroll: true });
  });
  document
    .querySelectorAll(".purchase-grid, .branch-grid, .social-cards")
    .forEach((group) => {
      [...group.children].forEach((card, index) =>
        card.style.setProperty("--reveal-delay", `${(index % 3) * 80}ms`),
      );
    });
  const hero = document.querySelector(".hero");
  if ("IntersectionObserver" in window) {
    const motionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          entry.target.classList.toggle(
            "motion-offscreen",
            !entry.isIntersecting,
          ),
        );
      },
      { rootMargin: "100px" },
    );
    document
      .querySelectorAll(".hero, .marquee")
      .forEach((element) => motionObserver.observe(element));
  }
  if (hero) {
    let lightFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    hero.addEventListener(
      "pointermove",
      (event) => {
        if (
          event.pointerType !== "mouse" ||
          reduced.matches ||
          root.classList.contains("motion-paused")
        )
          return;
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (lightFrame) return;
        lightFrame = requestAnimationFrame(() => {
          const rect = hero.getBoundingClientRect();
          hero.style.setProperty(
            "--light-x",
            `${((pointerX - rect.left) / rect.width) * 100}%`,
          );
          hero.style.setProperty(
            "--light-y",
            `${((pointerY - rect.top) / rect.height) * 100}%`,
          );
          lightFrame = 0;
        });
      },
      { passive: true },
    );
    hero.addEventListener("pointerleave", () => {
      cancelAnimationFrame(lightFrame);
      lightFrame = 0;
      hero.style.removeProperty("--light-x");
      hero.style.removeProperty("--light-y");
    });
  }
})();
