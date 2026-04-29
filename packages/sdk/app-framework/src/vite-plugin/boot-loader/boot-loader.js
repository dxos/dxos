//
// Copyright 2026 DXOS.org
//

// Inline driver script — injected into the host's `<body>` by `bootLoaderPlugin`.
// Runs before the module bundle is fetched, so the host can observe `boot:html-parsed`
// and update the visible status from `main.tsx` between phases.
//
// The loader has three runtime states:
//   - State 0 (idle):       no motion. Disc sits empty. Default on script load.
//   - State 1 (slow tick):  asymptotic creep toward `CREEP_ASYMPTOTE`%. Entered by `start()`.
//   - State 2 (progress):   host-driven, value supplied to `progress(fraction)`.
//
// `window.__bootLoader.status(text)`        updates the visible status line.
// `window.__bootLoader.start()`             enter state 1 (start the slow creep).
// `window.__bootLoader.progress(fraction)`  enter state 2 with `fraction` ∈ [0, 1].
// `window.__bootLoader.dismiss()`           remove the loader DOM (terminal).
//
// Kept ES5-flavoured so the bundler never has to touch it.

(function () {
  performance.mark('boot:html-parsed');

  // State 1 (slow tick) constants. The creep is an asymptotic ease toward
  // `CREEP_ASYMPTOTE` percent so the disc visibly *moves* without ever
  // implying real progress. The 240ms `transition` on the disc smooths each
  // tick and the eventual jump into state 2.
  var CREEP_ASYMPTOTE = 20;
  var CREEP_RATE = 0.04;
  var CREEP_TICK_MS = 100;

  // 0 = idle, 1 = slow tick, 2 = host-driven progress.
  var state = 0;
  var creepHandle = null;

  function startCreep() {
    creepHandle = setInterval(function () {
      var element = document.getElementById('boot-loader-disc');
      if (!element) {
        return;
      }
      var raw = parseFloat(element.style.getPropertyValue('--boot-loader-bar-progress')) || 0;
      var next = raw + (CREEP_ASYMPTOTE - raw) * CREEP_RATE;
      element.style.setProperty('--boot-loader-bar-progress', String(next));
      element.setAttribute('data-progress-active', '');
    }, CREEP_TICK_MS);
  }

  function stopCreep() {
    if (creepHandle != null) {
      clearInterval(creepHandle);
      creepHandle = null;
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
     * Enter state 1 (slow tick) — the disc creeps asymptotically toward
     * `CREEP_ASYMPTOTE`% so the loader reads as alive while the host has
     * nothing concrete to report yet. No-op if already in state 1 or 2.
     */
    start: function () {
      if (state !== 0) {
        return;
      }
      state = 1;
      startCreep();
    },

    /**
     * Enter state 2 (host-driven progress) — set the determinate ring to
     * `fraction` ∈ [0, 1]. Invalid / negative / non-finite values clamp to
     * 0 (the empty ring) rather than letting `NaN`/`Infinity` slip into
     * `--boot-loader-bar-progress`, which CSS would treat as invalid and
     * silently reset to the 0% var() default. State 1's creep timer (if
     * any) is cancelled; the inline-style write takes over smoothly via
     * the 240ms `transition: --boot-loader-bar-progress`.
     */
    progress: function (fraction) {
      stopCreep();
      state = 2;
      // Set the var on the disc so both the masked ring and the orbiting
      // dot (siblings inside `#boot-loader-disc`) inherit the same value.
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
      stopCreep();
      var element = document.getElementById('boot-loader');
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    },
  };
})();
