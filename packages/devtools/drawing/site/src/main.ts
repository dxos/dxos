//
// Copyright 2026 DXOS.org
//

const copy = document.getElementById('copy');
const command = document.getElementById('install-command');
copy?.addEventListener('click', () => {
  navigator.clipboard.writeText(command?.textContent ?? '').then(
    () => {
      copy.textContent = 'Copied';
    },
    () => {
      copy.textContent = 'Select and copy';
    },
  );
  window.setTimeout(() => {
    copy.textContent = 'Copy';
  }, 1600);
});

// The page is complete without the editor, so it loads after first paint and never blocks it.
const playground = document.getElementById('playground');
if (playground) {
  void import('./playground.tsx').then(({ mount }) => mount(playground));
}
