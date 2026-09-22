// Wheel-only inertia. Touch, keyboard, form controls and nested scrollers stay native.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, target = scrollY, current = scrollY, previous = 0, direction = 0;
  const limit = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const clamp = value => Math.max(0, Math.min(limit(), value));
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    current = target = scrollY;
    direction = 0;
  };
  const blocked = () => reduced.matches || document.querySelector('dialog[open]') || getComputedStyle(document.body).overflow === 'hidden';
  function tick(time) {
    if (blocked()) { stop(); return; }
    const elapsed = Math.min(50, Math.max(1, time - previous));
    previous = time;
    target = clamp(target);
    current += (target - current) * (1 - Math.exp(-elapsed / 160));
    if (Math.abs(target - current) < 0.5) {
      window.scrollTo({ top: target, behavior: 'instant' });
      frame = 0;
      return;
    }
    window.scrollTo({ top: current, behavior: 'instant' });
    frame = requestAnimationFrame(tick);
  }
  window.addEventListener('wheel', event => {
    if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY) || blocked()) return;
    for (let node = event.target; node instanceof Element && node !== document.body; node = node.parentElement) {
      if (node.matches('input, textarea, select, [contenteditable="true"], dialog')) { stop(); return; }
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1) { stop(); return; }
    }
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    const nextDirection = Math.sign(delta);
    if (!frame || nextDirection !== direction) current = target = scrollY;
    direction = nextDirection;
    target = clamp(Math.max(current - 500, Math.min(current + 500, target + delta * 0.55)));
    event.preventDefault();
    if (!frame) { previous = performance.now(); frame = requestAnimationFrame(tick); }
  }, { passive: false });
  for (const event of ['pointerdown', 'touchstart', 'keydown', 'focusin', 'resize', 'hashchange', 'pagehide']) window.addEventListener(event, stop, { passive: true });
  reduced.addEventListener('change', stop);
})();
