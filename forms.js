document.querySelectorAll('[data-mail-form]').forEach(form => {
  const status = form.querySelector('.form-status');
  const button = form.querySelector('[type=submit]');
  const preview = /(^|\.)github\.io$/.test(location.hostname) || ['localhost', '127.0.0.1'].includes(location.hostname) || location.protocol === 'file:';
  const show = (message, state) => {
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
  };
  if (preview) show('Vista previa: el envío se habilitará al publicar el sitio en su servidor.', 'preview');
  form.addEventListener('input', event => event.target.setCustomValidity?.(''));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    for (const field of form.querySelectorAll('input[required]:not([type=file]),textarea[required]')) field.setCustomValidity(field.value.trim() ? '' : 'Completá este campo.');
    if (!form.reportValidity()) return;
    if (preview) { show('El envío aún no está habilitado en esta vista previa. No se enviaron datos.', 'preview'); return; }
    const cv = form.querySelector('[name=cv]')?.files[0];
    if (cv && (!/\.pdf$/i.test(cv.name) || cv.size > 5 * 1024 * 1024)) { show('Adjuntá un PDF de hasta 5 MB.', 'error'); return; }
    const label = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Enviando…';
    show('Estamos enviando tu mensaje.', 'pending');
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (!response.ok || data.ok !== true) throw new Error(data.message || 'No pudimos enviar el formulario. Intentá más tarde.');
      form.reset();
      show(data.message, 'success');
    } catch (error) {
      show(error instanceof SyntaxError || error instanceof TypeError ? 'No se pudo confirmar el envío. Conservamos tus datos en el formulario para que puedas reintentar.' : error.message, 'error');
    } finally { button.disabled = false; button.innerHTML = label; }
  });
});
