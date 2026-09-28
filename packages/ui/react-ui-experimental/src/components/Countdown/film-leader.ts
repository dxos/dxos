//
// Copyright 2026 DXOS.org
//

// Import-free on purpose: autocue's driver transpiles this file on its own and injects it into any page it
// records, where no module resolution exists. `Countdown` wraps it for React.

export type FilmLeaderOptions = {
  /** First number of the count. */
  from?: number;
  /** Hold on a play button until it is clicked, so the person recording can start their recorder first. */
  wait?: boolean;
  /** Draw the classic leader's inner ring and crosshairs (off by default: the mark carries the frame). */
  reticle?: boolean;
  /** SVG markup drawn inside the ring behind the numeral; the DXOS mark by default, `false` for none. */
  logo?: string | false;
};

/**
 * The DXOS mark, copied from `@dxos/brand`'s `DXOS` icon rather than imported: this module must stay
 * import-free (see above), and the brand icon is a React component.
 */
export const DXOS_LOGO = `<svg viewBox="0 0 256 256" fill="currentColor">
  <path d="M127.96,85.307l2.83,-2.058l113.742,156.395l-4.684,5.025l-111.888,-69.93l-111.888,69.93l-4.684,-5.025l113.742,-156.395l2.83,2.058Zm100.309,143.873l-100.309,-137.925l-100.309,137.925l98.455,-61.534l3.708,0l98.455,61.534Z"/>
  <path d="M127.96,81.181l111.888,-69.93l4.684,5.025l-113.742,156.395l-2.83,-2.058l-2.83,2.058l-113.742,-156.395l4.684,-5.025l111.888,69.93Zm-100.309,-54.441l100.309,137.925l100.309,-137.925l-98.455,61.534l-3.708,-0l-98.455,-61.534Z"/>
  <rect x="124.467" y="85.307" width="6.998" height="85.307"/>
</svg>`;

const SECOND = 1_000;

export const FILM_LEADER_STYLES = `
  .curtain { position: fixed; inset: 0; z-index: 2147483647; display: flex; flex-direction: column; align-items: center;
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
    background: conic-gradient(rgba(255,255,255,0.28) var(--film-leader-sweep), transparent 0);
    animation: film-leader-sweep 1000ms linear infinite; }
  @keyframes film-leader-sweep { from { --film-leader-sweep: 0deg; } to { --film-leader-sweep: 360deg; } }
  .cross { position: absolute; background: rgba(255,255,255,0.45); }
  .cross.h { left: 0; right: 0; top: 50%; height: 2px; margin-top: -1px; }
  .cross.v { top: 0; bottom: 0; left: 50%; width: 2px; margin-left: -1px; }
  .ring { position: absolute; inset: 34px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.45); }
  /* Behind the numeral, sized so the mark's corners touch the rim: they sit ~162 units from the centre of
     its 256-unit box, and the rim's inner radius is 114px, so the box is 180px, 24px in from the rim. */
  .logo { position: absolute; inset: 24px; display: grid; place-items: center; color: rgba(255,255,255,0.22); }
  .logo svg { width: 100%; height: 100%; }
  .logo { transition: transform 600ms cubic-bezier(.6,0,.3,1); }
  .num { position: absolute; inset: 0; display: grid; place-items: center;
    font: 800 132px/1 ui-sans-serif, system-ui, sans-serif; color: #fff; text-shadow: 0 4px 18px rgba(0,0,0,.6); }
  .num.pop { animation: film-leader-pop 1000ms ease-out; }
  @keyframes film-leader-pop { 0% { transform: scale(1.35); opacity: 0; } 15% { transform: scale(1); opacity: 1; }
    85% { opacity: 1; } 100% { transform: scale(0.92); opacity: 0.2; } }
`;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The sweep animates a custom property, which only interpolates once registered; an `@property` rule
 * inside a shadow root is ignored, so it is registered on the document instead.
 */
const registerSweep = () => {
  try {
    CSS.registerProperty({ name: '--film-leader-sweep', syntax: '<angle>', inherits: false, initialValue: '0deg' });
  } catch {
    // Already registered.
  }
};

/**
 * Plays a play button (with `wait`), then a 3-2-1 film leader, over the whole viewport, and resolves when
 * the curtain has faded out. Everything, styles included, is appended to `root` and removed at the end.
 */
export const playFilmLeader = async (
  root: HTMLElement | ShadowRoot,
  { from = 3, wait = true, reticle = false, logo = DXOS_LOGO }: FilmLeaderOptions = {},
): Promise<void> => {
  registerSweep();
  const style = document.createElement('style');
  style.textContent = FILM_LEADER_STYLES;
  const curtain = document.createElement('div');
  curtain.className = 'curtain';
  curtain.innerHTML = `
    <button class="play" aria-label="Start"><svg viewBox="0 0 24 24"><path d="M5 3.5v17l15-8.5z" fill="#111"/></svg></button>
    <div class="hint">${wait ? 'Click to start' : 'Starting'}</div>`;
  root.append(style, curtain);
  try {
    const play = curtain.querySelector('.play');
    if (wait && play) {
      await new Promise((resolve) => play.addEventListener('click', resolve, { once: true }));
    } else {
      await sleep(1_200);
    }
    play?.classList.add('go');
    await sleep(220);
    curtain.innerHTML = `
      <div class="leader"><div class="sweep"></div>${
        reticle ? '<div class="cross h"></div><div class="cross v"></div><div class="ring"></div>' : ''
      }${logo ? `<div class="logo">${logo}</div>` : ''}<div class="num"></div></div>`;
    const num = curtain.querySelector<HTMLElement>('.num');
    const mark = curtain.querySelector<HTMLElement>('.logo');
    for (let count = from; count > 0 && num; count--) {
      num.textContent = String(count);
      num.classList.remove('pop');
      // Reading layout restarts the animation for the next numeral.
      void num.offsetWidth;
      num.classList.add('pop');
      // A quarter turn per count, accumulated so the mark keeps turning the same way.
      if (mark) {
        mark.style.transform = `rotate(${(from - count + 1) * 90}deg)`;
      }
      await sleep(SECOND);
    }
    curtain.classList.add('out');
    await sleep(350);
  } finally {
    curtain.remove();
    style.remove();
  }
};
