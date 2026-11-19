//
// Copyright 2026 DXOS.org
//

// The page ships production's app link; every other host's app is at `app.` of it (spec F-13.1), and the dev
// server serves the page and the app from one origin.
const appOrigin =
  import.meta.env.VITE_DRAWING_APP_URL ??
  (window.location.pathname.endsWith('.html')
    ? window.location.origin
    : `${window.location.protocol}//app.${window.location.host.replace(/^www\./, '')}`);
for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-app-link]')) {
  link.href = `${appOrigin}/`;
}

const copy = document.getElementById('copy');
const command = document.getElementById('install-command');
let reset: number | undefined;
copy?.addEventListener('click', () => {
  const show = (state: 'copied' | 'failed') => {
    copy.dataset.state = state;
    window.clearTimeout(reset);
    reset = window.setTimeout(() => {
      copy.dataset.state = 'idle';
    }, 1600);
  };
  navigator.clipboard.writeText(command?.textContent ?? '').then(
    () => show('copied'),
    () => {
      // Leaves the command selected so it can be copied by hand.
      if (command) {
        window.getSelection()?.selectAllChildren(command);
      }
      show('failed');
    },
  );
});

// The page is complete without the editor, so it loads after first paint and never blocks it.
const playground = document.getElementById('playground');
if (playground) {
  void import('./playground.tsx').then(({ mount }) => mount(playground));
}
