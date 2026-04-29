//
// Copyright 2026 DXOS.org
//

// Inline driver script — injected into the host's `<body>` by `bootLoaderPlugin`.
// Runs before the module bundle is fetched, so the host can observe `boot:html-parsed`
// and update the visible status from `main.tsx` between phases.
//
// `window.__bootLoader.status(text)` updates the visible status line.
// `window.__bootLoader.progress(fraction)` updates the determinate ring at `fraction` ∈ [0, 1].
// `window.__bootLoader.dismiss()` removes the loader DOM. Once the loader is
// gone, all three calls become no-ops.
//
// Kept ES5-flavoured so the bundler never has to touch it.

(function () {
  performance.mark('boot:html-parsed');

  // Auto-creep — the ring asymptotes toward ~12% on a 100ms tick so the loader
  // visibly *moves* between page-paint and the host's first `progress()` call.
  // Without this, the disc sits empty for whatever interval it takes the JS
  // bundle to parse, register a status, and start reporting plugin counts —
  // looks dead on a slow cold load. The first explicit `progress()` call
  // cancels the creep; the inline-style write smoothly takes over via the
  // 240ms `transition: --boot-loader-bar-progress` on `#boot-loader-disc`.
  var AUTO_CREEP_ASYMPTOTE = 12;
  var AUTO_CREEP_RATE = 0.04;
  var AUTO_CREEP_TICK_MS = 100;
  var autoCreepHandle = setInterval(function () {
    var element = document.getElementById('boot-loader-disc');
    if (!element) {
      return;
    }
    var raw = parseFloat(element.style.getPropertyValue('--boot-loader-bar-progress')) || 0;
    var next = raw + (AUTO_CREEP_ASYMPTOTE - raw) * AUTO_CREEP_RATE;
    element.style.setProperty('--boot-loader-bar-progress', String(next));
    element.setAttribute('data-progress-active', '');
  }, AUTO_CREEP_TICK_MS);

  function stopAutoCreep() {
    if (autoCreepHandle != null) {
      clearInterval(autoCreepHandle);
      autoCreepHandle = null;
    }
  }

  window.__bootLoader = {
    status: function (text) {
      var element = document.getElementById('boot-loader-status');
      if (element) {
        element.textContent = text;
      }
    },
    /**
     * Update the determinate progress arc to `fraction` ∈ [0, 1]. The first
     * call cancels the auto-creep — host-driven progress takes over from
     * whatever value the creep had reached, smoothed by the disc's 240ms
     * `transition: --boot-loader-bar-progress`. Invalid / negative /
     * non-finite values clamp to 0 (the empty ring) rather than letting
     * `NaN`/`Infinity` slip into the var, which CSS would treat as invalid
     * and silently reset to the 0% var() default.
     */
    progress: function (fraction) {
      stopAutoCreep();
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
      stopAutoCreep();
      var element = document.getElementById('boot-loader');
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    },
  };
})();
