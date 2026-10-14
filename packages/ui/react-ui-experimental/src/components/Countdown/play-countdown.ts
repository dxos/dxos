//
// Copyright 2026 DXOS.org
//

// Import-free on purpose: autocue's driver transpiles this file on its own and injects it into any page it
// records, where no module resolution exists. `Countdown` wraps it for React.

export type CountdownOptions = {
  /** First number of the count. */
  from?: number;
  /** Hold on the start ring until it is clicked, so the person recording can start their recorder first. */
  wait?: boolean;
  /** Stops the countdown (including the wait for a click) and removes it, e.g. when the host unmounts. */
  signal?: AbortSignal;
};

const SECOND = 1_000;

/** The numeral's face. Loaded into the document: an `@font-face` inside a shadow root is ignored. */
const COUNTER_FONT = 'Bungee Hairline';
const COUNTER_FONT_CSS = 'https://fonts.googleapis.com/css2?family=Bungee+Hairline&display=block';

export const COUNTDOWN_STYLES = `
  .curtain { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center;
    background: rgba(8,8,10,0.62); backdrop-filter: blur(3px); transition: opacity 350ms ease; }
  .curtain.out { opacity: 0; }
  /* One closed ring; the start state is the ring with a play triangle, and the whole ring is the button. */
  /* Sized to hug the numeral. Tailwind sky-400 for the triangle and the digits alike: the countdown is injected
     where no theme tokens reach. */
  .ring { position: relative; width: 180px; height: 180px; padding: 0; border: none; background: none; color: #38bdf8; }
  button.ring { pointer-events: auto; cursor: pointer; transition: transform 220ms cubic-bezier(.3,.7,.4,1); }
  button.ring:hover { transform: scale(1.04); }
  button.ring.go { transform: none; }
  .hoop { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
  .arc { fill: none; stroke: rgba(255,255,255,0.9); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 100 100; }
  /* The start of the ring runs clockwise from 12 o'clock until it is gone, over the whole count. */
  .arc.unwind { animation: countdown-unwind linear forwards; }
  @keyframes countdown-unwind { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -100; } }
  .triangle { position: absolute; inset: 0; margin: auto; width: 60px; height: 60px; transform: translateX(5px);
    transition: opacity 220ms ease; }
  /* On the click only the triangle goes: the ring stays, and becomes the ring that unwinds. */
  .go .triangle { opacity: 0; }
  .num { position: absolute; inset: 0; display: grid; place-items: center;
    font: 400 132px/1 'Bungee Hairline', ui-sans-serif, system-ui, sans-serif;
    color: #38bdf8; text-shadow: 0 4px 18px rgba(0,0,0,.6); }
  /* Forwards holds the faded last frame: without it the final numeral snaps back while the curtain fades. */
  .num.pop { animation: countdown-pop 1000ms ease-out forwards; }
  /* The count still runs; only its motion goes. */
  @media (prefers-reduced-motion: reduce) { .arc.unwind, .num.pop { animation: none; } }
  @keyframes countdown-pop { 0% { transform: scale(1.35); opacity: 0; } 15% { transform: scale(1); opacity: 1; }
    85% { opacity: 1; } 100% { transform: scale(0.92); opacity: 0; } }
`;

const RING = `<svg class="hoop" viewBox="0 0 100 100"><circle class="arc" cx="50" cy="50" r="48" pathLength="100"/></svg>`;
const TRIANGLE = `<svg class="triangle" viewBox="0 0 24 24"><path d="M5 3.5v17l15-8.5z" fill="currentColor"/></svg>`;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Resolves when `signal` aborts (never, without one), so every wait can race it. */
const aborted = (signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
    } else {
      signal?.addEventListener('abort', () => resolve(), { once: true });
    }
  });

/**
 * Adds the counter font's stylesheet to the document once and waits for the digits, but never long: offline
 * or blocked, the count falls back to the system face rather than stalling the take.
 */
const loadCounterFont = async () => {
  if (!document.querySelector(`link[href="${COUNTER_FONT_CSS}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = COUNTER_FONT_CSS;
    const loaded = new Promise((resolve) => {
      link.onload = resolve;
      link.onerror = resolve;
    });
    document.head.append(link);
    await Promise.race([loaded, sleep(1_500)]);
  }
  await Promise.race([document.fonts.load(`120px "${COUNTER_FONT}"`, '0123456789').catch(() => []), sleep(1_500)]);
};

/**
 * Shows a closed ring with a play triangle (with `wait`, until clicked), then counts down inside it while the
 * ring unwinds clockwise over the whole count, and resolves once the curtain has faded out. Everything, styles
 * included, is appended to `root` and removed at the end.
 */
export const playCountdown = async (
  root: HTMLElement | ShadowRoot,
  { from = 3, wait = true, signal }: CountdownOptions = {},
): Promise<void> => {
  // Started now, so it loads while the start ring waits for the click.
  const font = loadCounterFont();
  const style = document.createElement('style');
  style.textContent = COUNTDOWN_STYLES;
  const curtain = document.createElement('div');
  curtain.className = 'curtain';
  curtain.innerHTML = `<button class="ring" aria-label="Start">${RING}${TRIANGLE}</button>`;
  root.append(style, curtain);
  const stop = aborted(signal);
  const pause = (ms: number) => Promise.race([sleep(ms), stop]);
  try {
    const start = curtain.querySelector('button');
    if (wait && start) {
      await Promise.race([new Promise((resolve) => start.addEventListener('click', resolve, { once: true })), stop]);
    } else {
      await pause(1_200);
    }
    await Promise.race([font, stop]);
    if (signal?.aborted) {
      return;
    }
    start?.classList.add('go');
    await pause(220);
    curtain.innerHTML = `<div class="ring">${RING}<div class="num"></div></div>`;
    const num = curtain.querySelector<HTMLElement>('.num');
    const arc = curtain.querySelector<SVGElement>('.arc');
    if (arc) {
      arc.style.animationDuration = `${from * SECOND}ms`;
      arc.classList.add('unwind');
    }
    for (let count = from; count > 0 && num && !signal?.aborted; count--) {
      num.textContent = String(count);
      num.classList.remove('pop');
      // Reading layout restarts the animation for the next numeral.
      void num.offsetWidth;
      num.classList.add('pop');
      await pause(SECOND);
    }
    curtain.classList.add('out');
    await pause(350);
  } finally {
    curtain.remove();
    style.remove();
  }
};
