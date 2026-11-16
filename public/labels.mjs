import { bins } from './inventory.mjs';

for (const id of Object.keys(bins)) {
  const label = document.createElement('div');
  label.className = 'print-label';
  const image = document.createElement('img');
  image.src = `./assets/label-${id}.png`;
  image.alt = `QR-Code für Fach ${id}`;
  const caption = document.createElement('span');
  caption.textContent = id;
  label.append(image, caption);
  document.getElementById('labels').append(label);
}
document.getElementById('print').addEventListener('click', () => window.print());
