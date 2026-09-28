//
// Copyright 2026 DXOS.org
//

/**
 * An on-screen record of what the driver did, painted into the page so every capture carries it.
 *
 * A recording of an agent-driven session otherwise shows effects with no causes: a palette appears, a
 * plank opens, an object turns up in a list. The overlay adds the cause — a cursor and ripple where a
 * click landed, the chord for a key press, and a feed entry for every gesture, `eval` and operation —
 * so the video is evidence of what was done, not only of what the app looked like.
 *
 * Everything lives in one fixed, `pointer-events: none` host under a shadow root: the app's styles
 * cannot reach it, it cannot reach them, and `elementFromPoint` skips it so Playwright's actionability
 * checks and the app's own hit testing see straight through.
 */

const HOST_ID = '__demo_overlay__';

/**
 * Installed with `page.evaluate`, re-installed after every navigation, idempotent. Exposes
 * `window.__demoOverlay` with `event`, `resolve`, `click`, `moveCursor` and `countdown`. Self-contained because
 * `page.evaluate` serializes this function alone — nothing at module scope reaches the page.
 */
const install = ({ hostId, feedMs, position, feed: showFeed }) => {
  const mount = () => {
    const host = document.createElement('div');
    host.id = hostId;
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host { all: initial; }
        .feed { position: fixed; top: 10px; right: 10px; display: flex; flex-direction: column; align-items: flex-end;
          gap: 4px; font: 400 11px/14px ui-sans-serif, system-ui, sans-serif; }
        /* Fixed width and height: a feed that reflows with its content draws the eye away from the demo. */
        .entry { box-sizing: border-box; width: 240px; height: 36px; display: flex; gap: 6px; align-items: center;
          padding: 0 8px; border-radius: 6px; color: #fff; background: rgba(17,17,17,0.55);
          backdrop-filter: blur(4px); transition: opacity 400ms ease; }
        .entry.fade { opacity: 0; }
        .badge { flex: none; width: 34px; text-align: center; padding: 1px 0; border-radius: 3px;
          font: 600 8px/12px ui-monospace, SFMono-Regular, monospace; letter-spacing: 0.4px; text-transform: uppercase;
          color: #111; }
        .body { flex: 1; min-width: 0; }
        .label, .detail { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .detail { font: 10px/13px ui-monospace, SFMono-Regular, monospace; opacity: 0.65; }
        .status { flex: none; font-size: 11px; }
        .click { background: #7dd3fc; } .key { background: #fcd34d; } .type { background: #fcd34d; }
        .op { background: #c4b5fd; } .eval { background: #86efac; } .nav { background: #e5e7eb; } .drag { background: #7dd3fc; }
        .error { background: #fca5a5; }
        .keys { font-family: ui-monospace, SFMono-Regular, monospace; letter-spacing: 1px; }
        .cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; margin: -3px 0 0 -3px;
          transition: transform 280ms cubic-bezier(.3,.7,.4,1); filter: drop-shadow(0 1px 2px rgba(0,0,0,.5)); }
        .ripple { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
          border: 3px solid #0ea5e9; background: rgba(14,165,233,0.25); animation: ripple 650ms ease-out forwards; }
        @keyframes ripple { from { transform: scale(0.3); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
        .curtain { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 18px; background: rgba(8,8,10,0.62); backdrop-filter: blur(3px);
          transition: opacity 350ms ease; font: 500 14px/18px ui-sans-serif, system-ui, sans-serif; color: #fff; }
        .curtain.out { opacity: 0; }
        .play { pointer-events: auto; cursor: pointer; width: 132px; height: 132px; border: none; border-radius: 50%;
          background: rgba(255,255,255,0.92); box-shadow: 0 10px 40px rgba(0,0,0,.45);
          display: grid; place-items: center; transition: transform 220ms cubic-bezier(.3,.7,.4,1), opacity 220ms ease; }
        .play:hover { transform: scale(1.06); }
        .play.go { transform: scale(0.6); opacity: 0; }
        .play svg { width: 54px; height: 54px; margin-left: 8px; }
        .hint { opacity: 0.75; letter-spacing: 0.3px; }
        /* A film leader: a sweep that fills the ring once per count, crosshairs, and the numeral. */
        .leader { position: relative; width: 240px; height: 240px; border-radius: 50%; overflow: hidden;
          border: 6px solid rgba(255,255,255,0.9); box-shadow: 0 0 0 10px rgba(255,255,255,0.12);
          background: rgba(20,20,24,0.85); }
        .sweep { position: absolute; inset: 0; border-radius: 50%;
          background: conic-gradient(rgba(255,255,255,0.28) var(--p), transparent 0);
          animation: sweep 1000ms linear infinite; }
        @property --p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
        @keyframes sweep { from { --p: 0deg; } to { --p: 360deg; } }
        .cross { position: absolute; background: rgba(255,255,255,0.45); }
        .cross.h { left: 0; right: 0; top: 50%; height: 2px; margin-top: -1px; }
        .cross.v { top: 0; bottom: 0; left: 50%; width: 2px; margin-left: -1px; }
        .ring { position: absolute; inset: 34px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.45); }
        .num { position: absolute; inset: 0; display: grid; place-items: center;
          font: 800 132px/1 ui-sans-serif, system-ui, sans-serif; color: #fff; text-shadow: 0 4px 18px rgba(0,0,0,.6); }
        .num.pop { animation: pop 1000ms ease-out; }
        @keyframes pop { 0% { transform: scale(1.35); opacity: 0; } 15% { transform: scale(1); opacity: 1; }
          85% { opacity: 1; } 100% { transform: scale(0.92); opacity: 0.2; } }
      </style>
      <div class="feed"></div>
      <svg class="cursor" viewBox="0 0 24 24" style="display:none"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>
    `;
    document.documentElement.appendChild(host);
    const feed = root.querySelector('.feed');
    // The top-right corner is where most planks keep their toolbar; a demo whose subject lives there
    // moves the feed rather than hiding it.
    if (position.startsWith('bottom')) {
      Object.assign(feed.style, { top: 'auto', bottom: '96px', flexDirection: 'column-reverse' });
    }
    if (position.endsWith('left')) {
      Object.assign(feed.style, { right: 'auto', left: '16px', alignItems: 'flex-start' });
    }
    const cursor = root.querySelector('.cursor');

    const moveCursor = (x, y) => {
      cursor.style.display = '';
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    };

    const pending = new Map();

    const render = ({ kind, label, detail, keys, id }) => {
      const entry = document.createElement('div');
      entry.className = 'entry';
      entry.dataset.id = id ?? '';
      const badge = document.createElement('span');
      badge.className = `badge ${kind}`;
      badge.textContent = kind;
      const body = document.createElement('div');
      body.className = 'body';
      const main = document.createElement('div');
      main.className = keys ? 'label keys' : 'label';
      main.textContent = label;
      body.appendChild(main);
      if (detail) {
        const line = document.createElement('div');
        line.className = 'detail';
        line.textContent = detail;
        body.appendChild(line);
      }
      entry.append(badge, body);
      feed.appendChild(entry);
      while (feed.children.length > 4) {
        feed.firstElementChild.remove();
      }
      return entry;
    };

    const retire = (entry) => {
      setTimeout(() => entry.classList.add('fade'), feedMs);
      setTimeout(() => entry.remove(), feedMs + 450);
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * A play button, then a 3-2-1 film leader, so a person recording sees exactly when the take starts.
     * With `wait` the button holds until clicked, which lets them start their recorder first.
     */
    const countdown = async ({ from = 3, wait = true } = {}) => {
      const curtain = document.createElement('div');
      curtain.className = 'curtain';
      curtain.innerHTML = `
        <button class="play" aria-label="Start"><svg viewBox="0 0 24 24"><path d="M5 3.5v17l15-8.5z" fill="#111"/></svg></button>
        <div class="hint">${wait ? 'Click to start' : 'Starting'}</div>`;
      root.appendChild(curtain);
      const play = curtain.querySelector('.play');
      if (wait) {
        await new Promise((resolve) => play.addEventListener('click', resolve, { once: true }));
      } else {
        await sleep(1200);
      }
      play.classList.add('go');
      await sleep(220);
      curtain.innerHTML = `
        <div class="leader"><div class="sweep"></div><div class="cross h"></div><div class="cross v"></div>
          <div class="ring"></div><div class="num"></div></div>`;
      const num = curtain.querySelector('.num');
      for (let count = from; count > 0; count--) {
        num.textContent = String(count);
        num.classList.remove('pop');
        void num.offsetWidth;
        num.classList.add('pop');
        await sleep(1000);
      }
      curtain.classList.add('out');
      await sleep(350);
      curtain.remove();
    };

    window.__demoOverlay = {
      countdown,
      moveCursor,
      // `composer.invoke` is assigned by an effect after `composer` exists, so a caller about to invoke
      // re-wraps in its own page task rather than trusting the last install.
      wrapInvoke: () => wrapInvoke(),
      click: (x, y) => {
        moveCursor(x, y);
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        root.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
      },
      /** Returns an id so a pending entry (an operation in flight) can be resolved with its outcome. */
      event: (spec) => {
        if (!showFeed) {
          return;
        }
        const entry = render(spec);
        // A pending entry fades only once resolved, so a slow operation still shows how it ended.
        if (spec.id) {
          pending.set(spec.id, spec);
        } else {
          retire(entry);
        }
      },
      resolve: (id, ok, note) => {
        if (!showFeed) {
          return;
        }
        const spec = pending.get(id);
        pending.delete(id);
        // Evicted by newer entries while in flight: re-render it so the outcome is not lost.
        const entry = feed.querySelector(`[data-id="${CSS.escape(id)}"]`) ?? (spec && render(spec));
        if (!entry) {
          return;
        }
        retire(entry);
        const status = document.createElement('span');
        status.className = 'status';
        status.textContent = ok ? '✓' : '✗';
        status.style.color = ok ? '#86efac' : '#fca5a5';
        entry.appendChild(status);
        if (!ok) {
          entry.querySelector('.badge').classList.add('error');
        }
        // The error replaces the detail line rather than adding one, so every entry keeps its height.
        if (note) {
          let line = entry.querySelector('.detail');
          if (!line) {
            line = document.createElement('div');
            line.className = 'detail';
            entry.querySelector('.body').appendChild(line);
          }
          line.textContent = note;
        }
      },
    };
  };

  /**
   * Operations invoked from inside an `eval` snippet are programmatic too, so the entry point every
   * debug-port caller uses is wrapped rather than only the driver's own `invoke` op. `composer` appears
   * only once the app mounts — usually after the overlay did — hence the check on every install.
   */
  const wrapInvoke = () => {
    const composer = globalThis.composer;
    if (composer?.invoke && !composer.invoke.__demoWrapped) {
      const original = composer.invoke;
      const wrapped = async (key, input, options) => {
        // Random, not a per-wrapper counter: the app can replace `invoke`, and a fresh wrapper restarting at
        // op-1 would collide with an operation still in flight from the previous one.
        const id = `op-${crypto.randomUUID()}`;
        let detail;
        try {
          detail = input === undefined ? undefined : JSON.stringify(input);
        } catch {
          detail = String(input);
        }
        window.__demoOverlay?.event({ kind: 'op', label: String(key).replace(/^org\.dxos\./, ''), detail, id });
        try {
          const result = await original.call(composer, key, input, options);
          window.__demoOverlay?.resolve(id, true);
          return result;
        } catch (error) {
          window.__demoOverlay?.resolve(id, false, String(error?.message ?? error).slice(0, 160));
          throw error;
        }
      };
      wrapped.__demoWrapped = true;
      composer.invoke = wrapped;
    }
  };

  if (!document.getElementById(hostId) || !window.__demoOverlay) {
    mount();
  }
  wrapInvoke();
};

/**
 * @param {import('@playwright/test').Page} page
 * `feed: false` keeps the cursor and ripple but paints no feed entries — for a session a person records
 * themselves, where the pills would narrate the agent rather than the product.
 *
 * @param {{ enabled: boolean, feed?: boolean, feedMs?: number, position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' }} options
 */
export const createOverlay = (page, { enabled, feed = true, feedMs = 3_500, position = 'top-right' }) => {
  const ensure = () => page.evaluate(install, { hostId: HOST_ID, feedMs, position, feed });

  /** Overlay failures never fail a gesture: a page mid-navigation has no document to paint into. */
  const safely = async (fn) => {
    if (!enabled) {
      return;
    }
    try {
      await ensure();
      await fn();
    } catch {}
  };

  return {
    ensure: () => safely(async () => {}),
    event: (event) => safely(() => page.evaluate((payload) => window.__demoOverlay.event(payload), event)),
    resolve: (id, ok, note) =>
      safely(() => page.evaluate(([id, ok, note]) => window.__demoOverlay.resolve(id, ok, note), [id, ok, note])),
    click: (point) => safely(() => page.evaluate(({ x, y }) => window.__demoOverlay.click(x, y), point)),
    moveCursor: (point) => safely(() => page.evaluate(({ x, y }) => window.__demoOverlay.moveCursor(x, y), point)),
    countdown: (options) => safely(() => page.evaluate((args) => window.__demoOverlay.countdown(args), options)),
  };
};
