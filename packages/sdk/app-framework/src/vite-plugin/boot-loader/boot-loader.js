//
// Copyright 2026 DXOS.org
//

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
  /**
   * Switch the progress bar from the default indeterminate slide animation
   * to a determinate fill at `fraction` ∈ [0, 1]. Calling this once flips the
   * `[data-determinate]` flag; subsequent calls just update the percentage.
   * Pass a value < 0 (or omit) to revert to indeterminate.
   */
  progress: function (fraction) {
    var element = document.getElementById('boot-loader-bar');
    if (!element) {
      return;
    }
    // `Number.isFinite` rejects NaN and Infinity; without this guard
    // `NaN < 0` is false, so NaN slips past and ends up in
    // `--boot-loader-bar-progress`, which CSS treats as invalid and silently
    // resets the bar to the var() default (0%) — surprising visual snap if a
    // caller ever passes `0/0` or a parsed-but-invalid value.
    if (typeof fraction !== 'number' || !isFinite(fraction) || fraction < 0) {
      element.removeAttribute('data-determinate');
      element.style.removeProperty('--boot-loader-bar-progress');
      return;
    }
    var clamped = Math.max(0, Math.min(1, fraction));
    element.setAttribute('data-determinate', '');
    element.style.setProperty('--boot-loader-bar-progress', String(clamped * 100));
  },
  dismiss: function () {
    var element = document.getElementById('boot-loader');
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  },
};
