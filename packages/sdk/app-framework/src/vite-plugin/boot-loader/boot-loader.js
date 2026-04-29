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
   * Update the determinate progress arc to `fraction` ∈ [0, 1]. The ring is
   * always determinate — it sits empty at 0% until the first call. Invalid /
   * negative / non-finite values clamp to 0 (i.e. the empty ring) rather than
   * letting `NaN`/`Infinity` slip into `--boot-loader-bar-progress`, which
   * CSS would treat as invalid and silently reset to the 0% var() default.
   */
  progress: function (fraction) {
    // Set the var on the disc so both the masked ring and the orbiting dot
    // (siblings inside #boot-loader-disc) inherit the same progress value.
    var element = document.getElementById('boot-loader-disc');
    if (!element) {
      return;
    }
    var clamped = typeof fraction !== 'number' || !isFinite(fraction) || fraction < 0 ? 0 : Math.min(1, fraction);
    element.style.setProperty('--boot-loader-bar-progress', String(clamped * 100));
    // Toggle the leading-edge dot only while progress is strictly in (0, 1).
    if (clamped > 0 && clamped < 1) {
      element.setAttribute('data-progress-active', '');
    } else {
      element.removeAttribute('data-progress-active');
    }
  },

  dismiss: function () {
    var element = document.getElementById('boot-loader');
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  },
};
