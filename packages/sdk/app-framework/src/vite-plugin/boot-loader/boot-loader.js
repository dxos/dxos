//
// Copyright 2026 DXOS.org
//

// Inline driver script — injected into the host's `<body>` by `bootLoaderPlugin`.
// Runs before the module bundle is fetched, so the host can observe `boot:html-parsed`
// and update the visible status from `main.tsx` between phases.
//
// The loader has two host-driven states (plus an unobserved idle state on
// script entry that's promoted automatically — there's no API to opt out of
// motion on cold load, by design):
//   - State 1 (slow tick):  auto-entered the moment the inline script runs;
//                           asymptotic creep toward `STATE_1_ASYMPTOTE`%.
//   - State 2 (progress):   host-driven, value supplied to `progress(fraction)`.
//                           The creep stays alive in state 2 too, with a
//                           ceiling that climbs `STATE_2_BUMP` percent ahead
//                           of the most recent `progress()` call (capped at
//                           `ABSOLUTE_CEILING`). Between sparse host updates
//                           the ring keeps inching forward toward that
//                           ceiling, so a long activation gap doesn't read
//                           as a frozen disc.
//
// `window.__bootLoader.status(text)`        updates the visible status line.
// `window.__bootLoader.progress(fraction)`  enter state 2 with `fraction` ∈ [0, 1].
// `window.__bootLoader.dismiss()`           remove the loader DOM (terminal).
//
// Kept ES5-flavoured so the bundler never has to touch it.

(function () {
  performance.mark('boot:html-parsed');

  // Asymptotic creep — `next = raw + (ceiling - raw) * creepRate` per tick,
  // so the var eases toward `ceiling` and never quite reaches it.
  var CREEP_TICK_MS = 100;
  // State 1 creep is a "we're alive" hint before any real progress lands,
  // so it eases gently toward a low asymptote.
  var STATE_1_RATE = 0.04;
  var STATE_1_ASYMPTOTE = 20;
  // State 2 creep bridges the gap between sparse `progress()` calls.
  // Tuning is a trade-off:
  //   - Larger `STATE_2_RATE` → fills faster, but reaches the ceiling
  //     sooner and then sits idle (looks "paused").
  //   - Larger `STATE_2_BUMP` → ring leads further ahead of the host's
  //     last reported value, so subsequent host updates feel "behind"
  //     until they cross the lead.
  // Current values aim for continuous-but-modest motion through a ~5 s
  // activation silence: 50 % → ~64 % over 5 s, ceiling at host + 15 % so
  // real progress can catch up via `Math.max` without big jumps.
  var STATE_2_RATE = 0.05;
  var STATE_2_BUMP = 15;
  // Ring never auto-creeps past this — keeps the user from interpreting the
  // ring as "almost done" while the host hasn't actually said so.
  var ABSOLUTE_CEILING = 90;

  // 0 = idle (transient — auto-promoted to 1 immediately below),
  // 1 = slow tick, 2 = host-driven progress.
  var state = 0;
  var creepHandle = null;
  var creepCeiling = STATE_1_ASYMPTOTE;
  var creepRate = STATE_1_RATE;
  var trace = /(?:^|[?&])trace=1(?:&|$)/.test(window.location.search);
  var start = Date.now();
  var last = Date.now();
  var timings = [];

  function ensureCreep() {
    if (creepHandle != null) {
      return;
    }
    creepHandle = setInterval(function () {
      var element = document.getElementById('boot-loader-disc');
      if (!element) {
        return;
      }
      var raw = parseFloat(element.style.getPropertyValue('--boot-loader-bar-progress')) || 0;
      // Already at (or above) the ceiling — nothing to do this tick.
      if (raw >= creepCeiling - 0.1) {
        return;
      }
      var next = raw + (creepCeiling - raw) * creepRate;
      element.style.setProperty('--boot-loader-bar-progress', String(next));
      if (next > 0 && next < 100) {
        element.setAttribute('data-progress-active', '');
      }
    }, CREEP_TICK_MS);
  }

  function stopCreep() {
    if (creepHandle != null) {
      clearInterval(creepHandle);
      creepHandle = null;
    }
  }

  window.__bootLoader = {
    /**
     * Update the visible status line. The caller owns formatting — the
     * loader just renders `humanized` and records the structured fields
     * for the trace. Idempotent on `humanized`: equal back-to-back values
     * are a no-op for timings and the DOM update.
     *
     * Payload: `{ event?, module?, humanized }`.
     *   - `humanized`: the exact string to display (e.g. "Loading framework…",
     *     "Activating Observability: react-surface").
     *   - `event` / `module`: optional raw ids for the trace, when the
     *     update originates from an activation transition.
     */
    status: function (payload) {
      if (!payload || typeof payload !== 'object') {
        return;
      }
      var humanized = payload.humanized || '';
      var element = document.getElementById('boot-loader-status');
      if (element && element.textContent === humanized) {
        return;
      }
      if (timings.length > 0) {
        timings[timings.length - 1].duration = Date.now() - last;
      }
      var entry = { text: humanized };
      if (payload.event) {
        entry.event = payload.event;
      }
      if (payload.module) {
        entry.module = payload.module;
      }
      timings.push(entry);
      last = Date.now();
      if (element) {
        element.textContent = humanized;
      }
    },

    /**
     * Enter state 2 (host-driven progress) — set the determinate ring to
     * `fraction` ∈ [0, 1]. Invalid / negative / non-finite values clamp to
     * 0 (the empty ring) rather than letting `NaN`/`Infinity` slip into
     * `--boot-loader-bar-progress`, which CSS would treat as invalid and
     * silently reset to the 0% var() default. The state-1 creep timer is
     * left running with a new ceiling so the ring keeps inching forward
     * between host updates.
     *
     * The ring never regresses: if the requested value is below the
     * current var (e.g. the host's first call is `progress(0)` while the
     * creep had already reached ~12%), the existing value is held. The
     * host's progress catches up once it exceeds the held floor, so the
     * ring's motion stays monotonic across the state-1 → state-2 boundary.
     */
    progress: function (fraction) {
      state = 2;
      // Set the var on the disc so both the masked ring and the orbiting
      // dot (siblings inside `#boot-loader-disc`) inherit the same value.
      var element = document.getElementById('boot-loader-disc');
      if (!element) {
        return;
      }
      // Flip into "host-driven" mode the first time `progress()` lands —
      // CSS keys the brand mark's grayscale→color transition off this
      // attribute, so the mark eases from monochrome to full palette as
      // real progress starts arriving.
      element.setAttribute('data-host-driven', '');
      var clamped = typeof fraction !== 'number' || !isFinite(fraction) || fraction < 0 ? 0 : Math.min(1, fraction);
      var requestedPct = clamped * 100;
      var currentPct = parseFloat(element.style.getPropertyValue('--boot-loader-bar-progress')) || 0;
      var nextPct = Math.max(currentPct, requestedPct);
      element.style.setProperty('--boot-loader-bar-progress', String(nextPct));
      // Switch the ongoing creep to its state-2 cadence — faster ease and
      // a larger lead bump so the ring keeps moving while the host is
      // silent (e.g. composer-app's "Starting Composer…" stretch while the
      // first slow plugin module activates).
      creepRate = STATE_2_RATE;
      var newCeiling = Math.min(nextPct + STATE_2_BUMP, ABSOLUTE_CEILING);
      if (newCeiling > creepCeiling) {
        creepCeiling = newCeiling;
      }
      ensureCreep();
      // Toggle the leading-edge dot only while progress is strictly in (0, 1).
      if (nextPct > 0 && nextPct < 100) {
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

      if (trace) {
        if (timings.length > 0) {
          timings[timings.length - 1].duration = Date.now() - last;
        }
        console.log(JSON.stringify({ total: Date.now() - start, timings }, null, 2));
      }
    },
  };

  // Auto-promote idle → slow tick the moment this inline script executes,
  // so the disc starts moving on the very first frame the loader paints.
  // The host calls `progress()` later to take over.
  state = 1;
  ensureCreep();
})();
