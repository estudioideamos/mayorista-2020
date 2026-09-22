(() => {
  const destination = 'rrhh@m20mayorista.com';
  const form = document.querySelector('#careers-form');
  const ready = document.querySelector('#application-ready');
  const send = document.querySelector('#application-send');
  form.addEventListener('input', () => {
    ready.hidden = true;
    send.removeAttribute('href');
    form.querySelectorAll('input,textarea').forEach(field => field.setCustomValidity(''));
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    form.querySelectorAll('[required]').forEach(field => field.setCustomValidity(field.value.trim() ? '' : 'Completá este campo.'));
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const value = key => String(data.get(key) || '').trim();
    const subject = `Postulación laboral — ${value('name')}`;
    const body = `Hola, equipo de Recursos Humanos de Mayorista 2020.\n\nMe gustaría presentar mi postulación.\n\nNombre: ${value('name')}\nEmail: ${value('email')}\nTeléfono: ${value('phone')}\nLocalidad: ${value('area')}\n\n${value('profile')}\n\nMuchas gracias.`;
    document.querySelector('#application-preview').textContent = body;
    document.querySelector('#application-destination').textContent = `Para: ${destination}`;
    send.href = `mailto:${destination}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    ready.hidden = false;
    document.querySelector('#application-title').focus({ preventScroll: true });
    ready.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
})();
