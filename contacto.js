const branches = {
  jcp1: { name: 'JCP 1', phone: '5492320598474' },
  esquina: { name: 'JCP Esquina', phone: '5491172185142' },
  moreno: { name: 'Moreno · Cuartel V', phone: '5491161079275' },
  pilar: { name: 'Pilar', phone: '5492320510658' },
};
const form = document.querySelector('#contact-form');
const ready = document.querySelector('#message-ready');
const sendLink = document.querySelector('#whatsapp-send');
form.addEventListener('input', () => {
  ready.hidden = true;
  sendLink.removeAttribute('href');
  form.querySelectorAll('input, textarea').forEach(field => field.setCustomValidity(''));
});
form.addEventListener('change', () => { ready.hidden = true; sendLink.removeAttribute('href'); });
form.addEventListener('submit', event => {
  event.preventDefault();
  for (const id of ['name', 'message']) {
    const field = form.elements.namedItem(id);
    field.setCustomValidity(field.value.trim() ? '' : 'Completá este campo.');
  }
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const branch = branches[data.get('branch')];
  if (!branch) return;
  const lines = [
    `¡Hola, Mayorista 2020! Soy ${data.get('name').trim()}.`,
    `Sucursal: ${branch.name}.`,
  ];
  if (data.get('business').trim()) lines.push(`Comercio: ${data.get('business').trim()}.`);
  lines.push(`Forma de compra: ${data.get('format')}.`, '', data.get('message').trim());
  const message = lines.join('\n');
  document.querySelector('#message-preview').textContent = message;
  document.querySelector('#destination').textContent = `Para la sucursal ${branch.name}.`;
  sendLink.href = `https://wa.me/${branch.phone}?text=${encodeURIComponent(message)}`;
  ready.hidden = false;
  document.querySelector('#ready-title').focus({ preventScroll: true });
  ready.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
});
