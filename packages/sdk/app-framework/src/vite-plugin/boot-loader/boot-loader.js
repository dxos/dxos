// Inline driver script — injected into the host's `<body>` by `bootLoaderPlugin`.
// Runs before the module bundle is fetched, so the host can observe `boot:html-parsed`
// and update the visible status from `main.tsx` between phases.
//
// `window.__bootLoader.status(text)` updates the visible status line.
// `window.__bootLoader.dismiss()` removes the loader DOM. Once the loader is
// gone, both calls become no-ops.
//
// Kept ES5-flavoured so the bundler never has to touch it.

performance.mark('boot:html-parsed');

window.__bootLoader = {
  status: function (text) {
    var element = document.getElementById('boot-loader-status');
    if (element) {
      element.textContent = text;
    }
  },
  dismiss: function () {
    var element = document.getElementById('boot-loader');
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  },
};
