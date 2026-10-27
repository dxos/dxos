//
// Copyright 2026 DXOS.org
//

/**
 * A browser the agent drives one gesture at a time, recording the whole session to a `.webm`.
 *
 * Playwright specs are the wrong shape for a demo: the script decides every step up front, so a flow
 * whose next gesture depends on what the last one rendered cannot be expressed, and a `do:` step with
 * no operation behind it cannot be performed at all. This keeps one browser and one recording context
 * alive behind a loopback HTTP server, so the agent issues `click`/`fill`/`drag` as separate turns and
 * reads the result — or a screenshot — before choosing the next one.
 *
 *   node driver.mjs --port 7333 --url http://localhost:4173 --out /tmp/demo
 *   curl -sS localhost:7333/cmd -d '{"op":"click","selector":"[data-testid=x]"}'
 *   curl -sS localhost:7333/cmd -d '{"op":"stop"}'      # finalizes and prints the video path
 *
 * The video is written only on `stop`, so a crashed driver leaves nothing behind.
 *
 * With a full ffmpeg on the path the page renders at `--scale` device pixels (2 by default) and is
 * encoded to VP9 by `recorder.mjs`; without one it falls back to Playwright's `recordVideo`, whose
 * fixed 1 Mbit VP8 cannot carry more than 1x. `--overlay off` drops the on-screen action feed; `--feed bottom-left` (or any corner) moves it.
 *
 * `--mode manual` is for a session a person records themselves: a headed window, no recorder, the
 * cursor without the action pills or caption banners (`--pills on` / `--captions on` bring them back),
 * and `stop` leaves the browser open. The driver exits when that window is closed. The browser runs on
 * a persistent profile (`--profile`, default `~/.local/state/dxos/autocue/profile`).
 *
 * `--target tauri` drives the native desktop app instead of Chromium: `--app` names its binary (the release
 * build under `packages/apps/composer-app/src-tauri/target/release/app` by default). On Linux it runs under
 * `tauri-driver` on its own Xvfb screen (`--headed on` uses `$DISPLAY`); on macOS a test build serves WebDriver
 * itself and records from webview snapshots. Either way `tauri/recorder.mjs` records it.
 * The ops, the overlay and flow scripts are the same; `page` is `tauri/page.mjs`'s Playwright-shaped adapter.
 *
 * `--caption-position top|middle|bottom` (bottom) places step captions, and `--caption-background <0–1>` (0.6) sets
 * the opacity of their panel, which is blurred behind so the type stays legible. `--caption-colors white-on-black` or
 * `black-on-white` fixes the title's and captions' colours whatever the page's theme.
 *
 * `--theme` sets the emulated color scheme (`dark` by default, `light`). `--action-timeout` (5000 ms)
 * bounds how long a gesture, or a flow script's raw locator, waits for its target. `--cadence` (600 ms)
 * is the least time between two on-camera gestures. The app's `@dxos/log` output streams to `<out>/app.log`
 * (`--log <file>`, or `off`) in the NDJSON shape `scripts/query-logs.mjs` reads.
 */

import { chromium } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

import { FRAME_MODULE, injectModule } from './inject.mjs';
import { startLogTap, startPolledLogTap } from './logs.mjs';
import { createOverlay } from './overlay.mjs';
import { hasFullFfmpeg, startRecorder } from './recorder.mjs';
import { launchTauri } from './tauri/launch.mjs';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    'port': 7333,
    'url': 'http://localhost:4173',
    'out': 'demo-out',
    // A 16" laptop's layout: at 1280x800 Composer's chrome fills the frame and reads as a small-screen
    // app, however sharp the pixels are.
    'width': 1728,
    'height': 1080,
    'scale': 2,
    'fps': 25,
    'crf': 28,
    'quality': 92,
    'overlay': 'on',
    // App boot is rarely what a demo is about: the first `goto` waits for the app to be ready and cuts
    // everything before it. `--boot keep` records it when the boot is the subject.
    'boot': 'cut',
    // A plank, not the sidebar: Composer's sidebar renders ~8s before any space content does.
    'ready': '[data-testid="deck.plank"], #storybook-root > *',
    'ready-timeout': 180_000,
    'settle': 5_000,
    'feed': 'top-right',
    // Where captions sit (`top`, `middle` or `bottom`), and their background's opacity (0–1, translucent by default).
    'caption-position': 'bottom',
    'caption-background': 0.6,
    // `white-on-black` or `black-on-white` for the title and captions; unset, floating panels invert the page's theme.
    'caption-colors': undefined,
    'mode': 'record',
    // Manual mode only: the app's identity, spaces and dismissed first-run UI survive between sessions,
    // so the user's recording starts in a prepared app instead of onboarding.
    'profile': path.join(homedir(), '.local/state/dxos/autocue/profile'),
    // Emulated `prefers-color-scheme`; `--theme light` for a light recording.
    'theme': 'dark',
    // Per-gesture wait for its target: a wrong selector should fail in seconds, not stall the demo.
    'action-timeout': 5_000,
    // Minimum gap between consecutive gestures, the pause a person takes to find the next control.
    'cadence': 600,
    // NDJSON of the app's `@dxos/log` output, `app.log`-shaped; `<out>/app.log` when unset, `off` to skip.
    'log': undefined,
    // `browser` (Chromium through Playwright) or `tauri` (the native desktop app through WebDriver).
    'target': 'browser',
    // Tauri only: the app binary, and the WebDriver port: tauri-driver's on Linux (its native driver takes the
    // next), the app's own on macOS.
    'app': fileURLToPath(
      new URL('../../../../packages/apps/composer-app/src-tauri/target/release/app', import.meta.url),
    ),
    'driver-port': 4444,
    'headed': 'off',
    // `on` launches full Chromium's headless mode, which has the GPU, instead of the software-rendered headless shell.
    'gpu': 'off',
    // Tauri on macOS: `on` deletes the test build's profile before launch, for a first-run take.
    'fresh': 'off',
    // Extra Chromium flags, comma-separated, e.g. a fake microphone fed from a voice file:
    // `--use-fake-device-for-media-stream,--use-fake-ui-for-media-stream,--use-file-for-fake-audio-capture=/tmp/voice.wav`.
    'chromium-args': '',
  };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].replace(/^--/, '');
    const value = args[index + 1];
    // Every flag takes a value, so a trailing flag, or one followed by the next flag, would otherwise be misread;
    // `--chromium-args` is exempt because its value is itself a list of `--` flags.
    if (value === undefined || (value.startsWith('--') && key !== 'chromium-args')) {
      console.error(`--${key} needs a value`);
      process.exit(1);
    }
    options[key] = /^[\d.]+$/.test(value) ? Number(value) : value;
  }
  // A person recording their own screen wants the product on camera, not the agent's narration of it.
  const narrate = options.mode === 'manual' ? 'off' : 'on';
  // The action feed reads as debug chrome in a demo; `--pills on` brings it back.
  options.pills ??= 'off';
  options.captions ??= narrate;
  // Milliseconds between flow steps: a person watching live needs a beat to see each one land.
  options.pace ??= options.mode === 'manual' ? 800 : 0;
  // Milliseconds the cursor rests on a target before the click: a live viewer has to see what is about to be
  // chosen. A recording is trimmed, so it needs none.
  options.dwell ??= options.mode === 'manual' ? 1_000 : 0;
  return options;
};

const options = parseArgs();
// An invalid caption flag would otherwise reach the frame as NaN or an unknown class and silently drop the caption's look.
const background = options['caption-background'];
if (typeof background !== 'number' || !Number.isFinite(background) || background < 0 || background > 1) {
  console.error(`--caption-background must be a number from 0 to 1, not ${JSON.stringify(background)}`);
  process.exit(1);
}
if (!['top', 'middle', 'bottom'].includes(options['caption-position'])) {
  console.error(`--caption-position must be top, middle or bottom, not ${JSON.stringify(options['caption-position'])}`);
  process.exit(1);
}
if (
  options['caption-colors'] !== undefined &&
  !['white-on-black', 'black-on-white'].includes(options['caption-colors'])
) {
  console.error(
    `--caption-colors must be white-on-black or black-on-white, not ${JSON.stringify(options['caption-colors'])}`,
  );
  process.exit(1);
}
const manual = options.mode === 'manual';
const tauri = options.target === 'tauri';
mkdirSync(options.out, { recursive: true });

/**
 * Binding to loopback is not access control: any page the browser has open can POST here cross-origin
 * in `no-cors` mode, and while the response is opaque to it the command still runs — `eval` and `goto`
 * included. A token in a non-safelisted header cannot be set by such a request (it would force a
 * preflight, which this server never approves), so requiring one closes that path.
 */
const TOKEN_HEADER = 'x-demo-token';
const token = randomUUID();

// The cloud sandbox needs a pinned executable, the egress proxy passed as an arg, and a TLS 1.2 cap;
// gated so a real desktop run is never silently downgraded (see the `cloud-sandbox` skill).
const sandbox = process.env.CLAUDE_CODE_REMOTE ? process.env.HTTPS_PROXY : undefined;

const viewport = { width: options.width, height: options.height };
const hires = !manual && hasFullFfmpeg();
if (!manual && !hires) {
  console.warn('no ffmpeg with libvpx-vp9 on PATH (or FFMPEG_PATH): recording at 1x through Playwright');
}
const scale = hires ? options.scale : 1;

const launchOptions = {
  headless: !manual,
  // The default headless shell renders WebGL in software (SwiftShader), so a 3D plugin records at a few frames a
  // second and starves the page; full Chromium's headless mode (`--gpu on`) uses the GPU.
  ...(options.gpu === 'on' && !sandbox ? { channel: 'chromium' } : {}),
  executablePath: sandbox ? '/opt/pw-browsers/chromium' : undefined,
  args: [
    // The page follows the window, so a person can resize it for their capture without a fixed viewport
    // leaving dead space or scrollbars.
    ...(manual ? [`--window-size=${options.width},${options.height}`] : []),
    ...(sandbox
      ? [
          '--no-sandbox',
          `--proxy-server=${sandbox}`,
          '--proxy-bypass-list=127.0.0.1;localhost',
          '--ssl-version-max=tls1.2',
        ]
      : []),
    // `deviceScaleFactor` alone renders the page at 2x but the screencast still captures at CSS size, so
    // the "2x" video was 1x frames upscaled; forcing the scale browser-wide makes the frames real 2x.
    ...(scale !== 1 ? [`--force-device-scale-factor=${scale}`] : []),
    ...String(options['chromium-args'])
      .split(',')
      .filter((arg) => arg.length > 0),
  ],
};

/**
 * The native app, when `--target tauri`: it boots into its own origin, so `goto` with no `url` waits for it
 * there instead of navigating, and a `restart` reloads that origin.
 */
const native = tauri
  ? await launchTauri({
      app: options.app,
      width: options.width,
      height: options.height,
      scale,
      theme: options.theme,
      port: options['driver-port'],
      headed: manual || options.headed === 'on',
      proxy: sandbox,
      log: path.join(options.out, 'native.log'),
      fresh: options.fresh === 'on',
      onExit: (reason) => {
        console.error(`${reason}; the driver is exiting`);
        process.exit(1);
      },
    })
  : undefined;
if (native) {
  options.url = new URL(native.page.url()).origin;
  // `about:blank` or a custom scheme has an opaque origin, and a `restart` would navigate to "null".
  if (options.url === 'null') {
    throw new Error(`the app did not load an http origin (at ${native.page.url()})`);
  }
}

// A persistent context has no separate `Browser`: the context is the browser, and closing it quits.
const browser = manual || tauri ? undefined : await chromium.launch(launchOptions);
const context = tauri
  ? undefined
  : manual
    ? await chromium
        .launchPersistentContext(options.profile, { ...launchOptions, viewport: null, colorScheme: options.theme })
        .catch((error) => {
          // Chromium locks a profile to one process; the usual cause is the previous session's window.
          if (/already in use/.test(error.message)) {
            console.error(`profile ${options.profile} is in use: close the open demo window, or pass --profile`);
            process.exit(1);
          }
          throw error;
        })
    : await browser.newContext({
        viewport,
        deviceScaleFactor: scale,
        colorScheme: options.theme,
        recordVideo: hires ? undefined : { dir: options.out, size: viewport },
        // The sandbox's egress proxy re-signs some hosts (github.com) with its own CA, which Chromium does not
        // trust; the proxy itself verifies the upstream certificate.
        ignoreHTTPSErrors: Boolean(sandbox),
      });
// A persistent profile opens with a tab already; driving it avoids leaving a stray blank one beside it.
const page = native ? native.page : (context.pages()[0] ?? (await context.newPage()));
page.setDefaultTimeout(options['action-timeout']);
const logFile = options.log === 'off' ? undefined : (options.log ?? path.join(options.out, 'app.log'));
const logTap = logFile
  ? await (native ? startPolledLogTap({ page, file: logFile }) : startLogTap({ context, page, file: logFile }))
  : undefined;
// A blinking caret is motion the trimmer cannot tell from typing, so a recording holds it steady.
if (!manual && !native) {
  await context.addInitScript(() => {
    const style = () => {
      const sheet = document.createElement('style');
      sheet.textContent = '.cm-cursorLayer, .cm-cursor { animation: none !important; }';
      document.head.append(sheet);
    };
    document.head ? style() : document.addEventListener('DOMContentLoaded', style);
  });
}

const overlay = createOverlay(page, {
  enabled: options.overlay !== 'off',
  feed: options.pills !== 'off',
  position: options.feed,
});

if (manual && !native) {
  // The window is the person's now; closing it is how they end the session.
  page.on('close', () => context.close().finally(() => process.exit(0)));
  context.on('close', () => process.exit(0));
}

const recorder = !hires
  ? undefined
  : native
    ? await native.record({
        dir: options.out,
        file: path.join(options.out, 'session.webm'),
        size: { width: viewport.width * scale, height: viewport.height * scale },
        fps: options.fps,
        crf: options.crf,
      })
    : await startRecorder(page, {
        dir: options.out,
        file: path.join(options.out, 'session.webm'),
        size: { width: viewport.width * scale, height: viewport.height * scale },
        fps: options.fps,
        crf: options.crf,
        quality: options.quality,
      });

/**
 * When each caption went up, measured from the first frame of the recording. `trim-static.mjs` remaps
 * these onto the trimmed timeline and turns them into chapters and a WebVTT track, so the steps stay
 * navigable instead of living only in burned-in pixels.
 */
let started = recorder?.started ?? Date.now();
const timeline = [];

/** Captions are re-injected per call because a navigation wipes the overlay. */
const CAPTION_ID = '__demo_caption__';
const SPEED_ID = '__demo_speed__';
/** `speed` ops in recording time, for the trimmer to play those stretches faster. */
const speedChanges = [];

/**
 * The caption and title are the `tools/autocue` Frame, in overlay mode over the recorded page. `update` names only
 * what changes: `caption` / `header` (`{ title, subtitle }`, or null to clear), `captionPosition` (`top`, `middle` or
 * `bottom`), and `open` (ms to hold the title as a centred panel before it moves to the header).
 */
const updateFrame = async (update) => {
  await injectModule(page, FRAME_MODULE, '__autocueFrame');
  await page.evaluate(
    ({ id, update, caption }) => {
      let host = document.getElementById(id);
      if (!host) {
        host = document.createElement('div');
        host.id = id;
        host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
        document.body.appendChild(host);
        host.__frame = window.__autocueFrame.createFrame(host.attachShadow({ mode: 'open' }), {
          mode: 'overlay',
          captionPosition: caption.position,
          captionBackground: caption.background,
          colors: caption.colors,
        });
      }
      const frame = host.__frame;
      if ('headerBand' in update) {
        frame.setHeaderBand(update.headerBand);
      }
      if ('header' in update) {
        frame.setHeader(update.header ?? undefined);
      }
      if (update.captionPosition) {
        frame.setCaptionPosition(update.captionPosition);
      }
      if ('caption' in update) {
        frame.setCaption(update.caption ?? undefined);
      }
      if (update.open) {
        void frame.playOpen(update.open);
      }
    },
    {
      id: CAPTION_ID,
      update,
      caption: {
        position: options['caption-position'],
        background: options['caption-background'],
        colors: options['caption-colors'],
      },
    },
  );
};

const KEY_SYMBOLS = {
  Meta: '\u2318',
  Control: 'Ctrl',
  Shift: '\u21e7',
  Alt: '\u2325',
  Enter: '\u21b5',
  Escape: 'Esc',
  ArrowUp: '\u2191',
  ArrowDown: '\u2193',
  ArrowLeft: '\u2190',
  ArrowRight: '\u2192',
  Backspace: '\u232b',
  Tab: '\u21e5',
};

/** `Meta+Shift+KeyK` (Playwright's chord syntax) rendered the way a shortcut list would show it. */
const keyLabel = (key) =>
  key
    .split('+')
    .map((part) => KEY_SYMBOLS[part] ?? part.replace(/^(Key|Digit)/, ''))
    .join(' ');

/** First line of a snippet, so a feed entry names the probe without becoming a code listing. */
const summarize = (value, limit = 140) => {
  const text = String(value ?? '').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}\u2026` : text;
};

const locator = (command) =>
  command.text ? page.getByText(command.text, { exact: !!command.exact }) : page.locator(command.selector);

/**
 * What a viewer would call the element — its accessible name or visible text before its testid — so the
 * feed reads "Click New space" rather than a selector.
 */
const describe = async (target, command) => {
  if (command.label) {
    return command.label;
  }
  const name = await target
    .evaluate(
      (element) =>
        (
          element.getAttribute('aria-label') ||
          element.getAttribute('title') ||
          element.innerText ||
          element.getAttribute('placeholder') ||
          element.getAttribute('data-testid') ||
          ''
        )
          .trim()
          .split('\n')[0],
    )
    .catch(() => '');
  return summarize(name || command.text || command.selector, 60);
};

let lastGesture = 0;

/**
 * Holds a gesture until `--cadence` has passed since the previous one, so back-to-back clicks read as a
 * person's rather than a script's; a gesture after a long wait goes at once. Off-camera gestures skip it.
 */
const cadence = async (command) => {
  if (command.hud === false) {
    return;
  }
  const wait = (command.cadence ?? options.cadence) - (Date.now() - lastGesture);
  if (wait > 0) {
    await page.waitForTimeout(wait);
  }
};

const gestured = () => {
  lastGesture = Date.now();
};

/**
 * The cursor moves to the target and rests there (`dwell`), then the ripple, then a beat, then the click: the
 * viewer's eye has to reach the target, and see which one it is, before its effect replaces it.
 */
const pointAt = async (target, command, kind) => {
  if (command.hud === false) {
    return;
  }
  const box = await target.boundingBox({ timeout: command.timeout ?? options['action-timeout'] }).catch(() => null);
  // No box means no element yet; probing it for a name would wait out the default timeout first.
  const label = box
    ? await describe(target, command)
    : summarize(command.label || command.text || command.selector, 60);
  if (box) {
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const dwell = command.dwell ?? options.dwell;
    if (dwell > 0) {
      await overlay.moveCursor(point);
      await page.waitForTimeout(dwell);
    }
    await overlay.click(point);
  }
  await overlay.event({ kind, label, detail: command.value === undefined ? undefined : summarize(command.value) });
  if (box) {
    await page.waitForTimeout(command.beat ?? 250);
  }
};

/** Center of an element, for gestures that need real coordinates rather than a locator. */
const center = async (selector) => {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) {
    throw new Error(`no bounding box: ${selector}`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/**
 * Drops everything recorded so far. Captions already issued are dropped too, since their times would
 * point into footage that no longer exists.
 */
const NO_CUT = {
  cut: false,
  reason: manual
    ? 'manual mode records nothing'
    : tauri
      ? 'no ffmpeg with libvpx-vp9, so nothing is recorded'
      : 'the 1x Playwright fallback cannot drop recorded frames',
};

const cut = async () => {
  if (!recorder) {
    return NO_CUT;
  }
  // The banner is page DOM, so it would outlive the timeline entry it belongs to; the page is repainted
  // before the cut so the frame the recorder keeps does not carry it either.
  await page.evaluate((id) => document.getElementById(id)?.remove(), CAPTION_ID).catch(() => {});
  // Bounded: a hidden native window renders no frames.
  await page.evaluate(() =>
    Promise.race([
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      new Promise((resolve) => setTimeout(resolve, 200)),
    ]),
  );
  // The repainted frame reaches the recorder over CDP a beat after the paint itself.
  await page.waitForTimeout(150);
  started = recorder.cut();
  timeline.length = 0;
  speedChanges.length = 0;
  return { cut: true };
};

let booted = false;

/**
 * The flow script `run` last executed and the 0-based index of its next step, so a bare `run` resumes
 * where the previous one stopped — "carry on" needs no bookkeeping from the caller.
 */
/**
 * `state` is what `status` reports while a backgrounded `run` is in flight: `setup` (off-camera steps),
 * `cued` (the play button is up and waiting), `running`, then `done`, `failed` or `aborted` with `result`.
 */
const flow = {
  file: undefined,
  next: 0,
  aborted: false,
  interrupt: undefined,
  state: 'idle',
  step: undefined,
  result: undefined,
};

class Aborted extends Error {}

/**
 * Races a step against `abort`, so a step blocked on a long wait (an agent run can take many minutes)
 * stops now rather than when its wait expires; the abandoned wait times out on its own later.
 */
const interruptible = (promise) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      flow.interrupt = () => reject(new Aborted('aborted'));
    }),
  ]).finally(() => {
    flow.interrupt = undefined;
  });

const slug = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

/** A query string defeats the ESM module cache, so an edited script is picked up on the next `run`. */
const loadFlow = async (file) => {
  const module = await import(`${pathToFileURL(file).href}?v=${Date.now()}`);
  if (!Array.isArray(module.steps)) {
    throw new Error(`${file} does not export a \`steps\` array`);
  }
  return module.steps;
};

/** 1-based step numbers or step names, as a person would say them, to a 0-based index. */
const stepIndex = (steps, ref, fallback) => {
  if (ref === undefined) {
    return fallback;
  }
  const index = typeof ref === 'number' ? ref - 1 : steps.findIndex((step) => step.name === ref);
  if (index < 0 || index >= steps.length) {
    throw new Error(`no step ${JSON.stringify(ref)} (steps are 1..${steps.length})`);
  }
  return index;
};

/** The body of the `run` op; `run` wraps it to keep `flow.state` current for `status`. */
const runFlow = async (command) => {
  if (!command.file && !flow.file) {
    throw new Error('no flow script: pass "file"');
  }
  const file = path.resolve(command.file ?? flow.file);
  const steps = await loadFlow(file);
  if (file !== flow.file) {
    flow.file = file;
    flow.next = 0;
  }
  const from = stepIndex(steps, command.from, flow.next);
  const until = stepIndex(steps, command.until, steps.length - 1);
  if (from >= steps.length) {
    return { steps: [], next: null, of: steps.length, done: true };
  }
  const shots = path.join(options.out, 'steps');
  mkdirSync(shots, { recursive: true });
  const screenshot = async (index) => {
    const shot = path.join(shots, `${String(index + 1).padStart(2, '0')}-${slug(steps[index].name)}.png`);
    return page.screenshot({ path: shot }).then(
      () => shot,
      () => undefined,
    );
  };

  const failure = (error) =>
    // Playwright colours its call log for a terminal; the escapes are noise in a JSON reply.
    stripVTControlCharacters(error.message ?? String(error))
      .split('\n')
      .slice(0, 6)
      .join('\n');

  // Steps call the same handlers as the HTTP ops, so the cursor and pills behave identically. The
  // quiet variant is for replay: no cursor, no pills, no captions, since none of it is the demo.
  const makeDemo = (quiet) =>
    Object.fromEntries(
      Object.entries(handlers)
        .filter(([op]) => !['run', 'abort', 'steps', 'status', 'stop'].includes(op))
        .map(([op, handler]) => [
          op,
          quiet && (op === 'caption' || op === 'title')
            ? async () => ({})
            : (args = {}) => handler({ op, ...args, ...(quiet ? { hud: false } : {}) }),
        ]),
    );
  const demo = makeDemo(false);
  flow.aborted = false;

  const replayed = [];
  if (command.restart || command.replay) {
    if (command.restart) {
      await page.goto(command.url ?? options.url, { waitUntil: 'domcontentloaded' });
      await page.locator(options.ready).first().waitFor({ state: 'visible', timeout: options['ready-timeout'] });
      await page.waitForTimeout(options.settle);
    }
    const quiet = makeDemo(true);
    for (let index = 0; index < from; index++) {
      const step = steps[index];
      try {
        if (step.done && (await step.done({ page, demo: quiet }))) {
          replayed.push({ step: index + 1, name: step.name, skipped: true });
          continue;
        }
        await step.run({ page, demo: quiet });
        replayed.push({ step: index + 1, name: step.name, ok: true });
      } catch (error) {
        flow.next = index;
        replayed.push({
          step: index + 1,
          name: step.name,
          ok: false,
          error: failure(error),
          screenshot: await screenshot(index),
        });
        return { replayed, steps: [], failed: index + 1, next: index + 1, of: steps.length };
      }
    }
  }

  const results = [];
  for (let index = from; index <= until; index++) {
    if (flow.aborted) {
      return { replayed, steps: results, aborted: true, next: index + 1, of: steps.length };
    }
    const step = steps[index];
    flow.step = index + 1;
    flow.state = step.setup ? 'setup' : 'running';
    try {
      // The take starts where setup ends: a play button, then 3-2-1, so the person recording knows
      // the moment everything before it stops being preparation.
      const opening = !step.setup && (index === 0 || steps[index - 1].setup);
      if (opening && index > 0 && command.countdown !== false) {
        flow.state = 'cued';
        await interruptible(overlay.countdown({ wait: command.wait ?? manual }));
        flow.state = 'running';
      }
      // `title` opens the take with the Frame's open: the title alone, centred, held until it hands off. It is a
      // chapter too, so the trimmer gives its still frames the caption hold rather than cutting them.
      if (opening && command.title) {
        const open = command.title.open ?? 3_000;
        timeline.push({ ms: Date.now() - started, text: command.title.value, narration: command.title.value });
        // With captions off nothing is painted, so the take must not stand still for a title nobody sees.
        if (options.captions !== 'off') {
          await interruptible(handlers.title({ ...command.title, open, hold: open + 600 }));
        }
      }
      // `captions: true` captions every on-camera step with its `caption` (or name), as a `.mdl` run would.
      if (!step.setup && command.captions) {
        await handlers.caption({ value: step.caption ?? step.name, subtitle: step.subtitle });
      }
      // Every on-camera step is a chapter, and its `narration` (or name) the line a voice-over speaks; it is
      // committed only once the step succeeds, so a retried step does not leave a duplicate chapter.
      const at = Date.now();
      const mark = { ms: at - started, text: step.name, narration: step.narration ?? step.name };
      await interruptible(step.run({ page, demo }));
      if (!step.setup) {
        // A boot cut inside the step (its `goto`) moves `started`; the chapter then opens at the cut.
        mark.ms = Math.max(0, at - started);
        timeline.push(mark);
      }
      results.push({ step: index + 1, name: step.name, ok: true, screenshot: await screenshot(index) });
      flow.next = index + 1;
    } catch (error) {
      flow.next = index;
      if (error instanceof Aborted) {
        return { replayed, steps: results, aborted: true, next: index + 1, of: steps.length };
      }
      results.push({
        step: index + 1,
        name: step.name,
        ok: false,
        error: failure(error),
        screenshot: await screenshot(index),
      });
      return { replayed, steps: results, failed: index + 1, next: index + 1, of: steps.length };
    }
    if (index < until) {
      await page.waitForTimeout(command.pace ?? options.pace);
    }
  }
  return { replayed, steps: results, next: flow.next < steps.length ? flow.next + 1 : null, of: steps.length };
};

const handlers = {
  goto: async (command) => {
    // The native app has already loaded its own origin; navigating there again would only reboot it.
    if (!native || command.url) {
      await page.goto(command.url ?? options.url, { waitUntil: command.waitUntil ?? 'domcontentloaded' });
    }
    const result = { url: page.url() };
    // Only the first navigation boots the app; a later `goto` is part of the demo.
    if (!booted && options.boot !== 'keep' && !manual) {
      booted = true;
      if (!recorder) {
        // Waiting minutes for a ready screen buys nothing when the footage cannot be dropped anyway.
        await overlay.event({ kind: 'nav', label: summarize(page.url(), 80) });
        return { ...result, boot: NO_CUT };
      }
      const ready = await page
        .locator(options.ready)
        .first()
        .waitFor({ state: 'visible', timeout: options['ready-timeout'] })
        .then(() => true)
        .catch(() => false);
      if (ready) {
        // A plank mounts seconds before its content has filled in, more on a fresh profile.
        await page.waitForTimeout(options.settle);
        result.boot = await cut();
      } else {
        result.boot = { cut: false, reason: `no ${options.ready} within ${options['ready-timeout']}ms` };
      }
    }
    await overlay.event({ kind: 'nav', label: summarize(page.url(), 80) });
    return result;
  },
  cut: () => cut(),
  click: async (command) => {
    const target = locator(command).first();
    await cadence(command);
    await pointAt(target, command, 'click');
    await target.click({ timeout: command.timeout ?? options['action-timeout'], button: command.button ?? 'left' });
    gestured();
    return {};
  },
  fill: async (command) => {
    const target = locator(command).first();
    await cadence(command);
    await pointAt(target, command, 'type');
    await target.fill(command.value, { timeout: command.timeout ?? options['action-timeout'] });
    gestured();
    return {};
  },
  type: async (command) => {
    const target = locator(command).first();
    await cadence(command);
    await pointAt(target, command, 'type');
    await target.pressSequentially(command.value, { delay: command.delay ?? 60 });
    gestured();
    return {};
  },
  /** The entry goes up first so the chord and the key's effect share frames. */
  press: async (command) => {
    await cadence(command);
    if (command.hud !== false) {
      await overlay.event({ kind: 'key', label: keyLabel(command.key), keys: true });
    }
    await page.keyboard.press(command.key);
    gestured();
    return {};
  },
  keys: async (command) => {
    await overlay.event({ kind: 'key', label: keyLabel(command.key), keys: true });
    return {};
  },
  hover: async (command) => {
    const target = locator(command).first();
    await cadence(command);
    const box =
      command.hud === false
        ? null
        : await target.boundingBox({ timeout: command.timeout ?? options['action-timeout'] }).catch(() => null);
    if (box) {
      await overlay.moveCursor({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    }
    await target.hover({ timeout: command.timeout ?? options['action-timeout'] });
    gestured();
    return {};
  },
  /**
   * A slow, stepped mouse drag rather than `dragTo`. The chess board's drop targets come from
   * pragmatic-drag-and-drop, which only arms its drop zones after it sees movement — a single
   * synthetic jump lands on `canDrop` having never fired.
   */
  drag: async (command) => {
    const from = command.fromXY ?? (await center(command.from));
    const to = command.toXY ?? (await center(command.to));
    const visible = command.hud !== false;
    await cadence(command);
    if (visible) {
      await overlay.click(from);
      await overlay.event({
        kind: 'drag',
        label: command.label ?? `${command.from ?? 'point'} \u2192 ${command.to ?? 'point'}`,
      });
    }
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    const steps = command.steps ?? 20;
    for (let step = 1; step <= steps; step++) {
      await page.mouse.move(from.x + ((to.x - from.x) * step) / steps, from.y + ((to.y - from.y) * step) / steps);
      if (visible) {
        await overlay.moveCursor({
          x: from.x + ((to.x - from.x) * step) / steps,
          y: from.y + ((to.y - from.y) * step) / steps,
        });
      }
      await page.waitForTimeout(command.stepDelay ?? 16);
    }
    await page.mouse.up();
    gestured();
    if (visible) {
      await overlay.click(to);
    }
    return { from, to };
  },
  waitFor: async (command) => {
    await locator(command)
      .first()
      .waitFor({ state: command.state ?? 'visible', timeout: command.timeout ?? 30_000 });
    return {};
  },
  text: async (command) => {
    const target = command.selector || command.text ? locator(command).first() : page.locator('body');
    return { text: (await target.innerText()).slice(0, command.limit ?? 4_000) };
  },
  count: async (command) => ({ count: await locator(command).count() }),
  /**
   * Shown in the feed and resolved with its outcome; operations the snippet calls through
   * `composer.invoke` get entries of their own from the wrapper `overlay.mjs` installs.
   */
  eval: async (command) => {
    const id = `eval-${randomUUID()}`;
    if (command.hud !== false) {
      await overlay.event({ kind: 'eval', label: command.label ?? 'eval', detail: summarize(command.expr, 240), id });
    }
    try {
      const value = await page.evaluate(command.expr);
      await overlay.resolve(id, true);
      return { value };
    } catch (error) {
      await overlay.resolve(id, false, summarize(error.message?.split('\n')[0].replace(/^page\.evaluate: /, ''), 160));
      throw error;
    }
  },
  /** One operation through `composer.invoke`, the same entry point the debug port uses. */
  invoke: async (command) => {
    await overlay.ensure();
    const value = await page.evaluate(
      async ({ key, input, spaceId }) => {
        window.__demoOverlay?.wrapInvoke();
        if (!globalThis.composer?.invoke) {
          throw new Error('composer.invoke is unavailable — the app has not finished mounting');
        }
        return globalThis.composer.invoke(key, input, spaceId ? { spaceId } : undefined);
      },
      { key: command.key, input: command.input ?? {}, spaceId: command.spaceId },
    );
    return { value };
  },
  caption: async (command) => {
    if (options.captions !== 'off') {
      // `position` moves this caption and the ones after it, so it can clear what the step shows.
      await updateFrame({
        caption: { title: command.value, subtitle: command.subtitle },
        captionPosition: command.position,
      });
    }
    timeline.push({
      ms: Date.now() - started,
      text: command.value,
      subtitle: command.subtitle,
      ...(command.hold ? { hold: command.hold } : {}),
    });
    if (command.hold) {
      await page.waitForTimeout(command.hold);
    }
    return { at: (Date.now() - started) / 1000 };
  },
  /**
   * Executes steps of a flow script (see `flow.example.mjs`) against the live page, screenshotting after
   * each one so a failure can be diagnosed from what the page showed rather than guessed at. Stops at the
   * first failure and leaves `next` on the failed step, so a fixed script is retried from there.
   *
   * `restart: true` reloads the app and `replay: true` (implied by `restart`) first brings it to the
   * state `from` expects by running every earlier step off camera — skipping any whose `done` check
   * already holds — so a flow can be picked up at any step after a reload, a crash or a new session.
   */
  run: async (command) => {
    flow.state = 'running';
    flow.result = undefined;
    try {
      const result = await runFlow(command);
      flow.state = result.failed ? 'failed' : result.aborted ? 'aborted' : 'done';
      flow.result = result;
      return result;
    } catch (error) {
      flow.state = 'failed';
      flow.result = { error: String(error?.message ?? error) };
      throw error;
    }
  },
  /** Where a backgrounded `run` is: poll it rather than holding the `run` request open. */
  status: () => ({
    state: flow.state,
    step: flow.step,
    next: flow.next + 1,
    ...(flow.result ? { result: flow.result } : {}),
  }),
  /** A start ring, then a 3-2-1 as it unwinds; `wait` (default in manual mode) holds until the button is clicked. */
  countdown: async (command) => {
    await overlay.countdown({ from: command.from ?? 3, wait: command.wait ?? manual });
    return {};
  },
  /** Stops the step in flight at once and leaves `next` on it, so a bare `run` retries it. */
  abort: () => {
    flow.aborted = true;
    flow.interrupt?.();
    return {};
  },
  /** Loads a script without running it: its step names, and which one a bare `run` starts from. */
  steps: async (command) => {
    if (!command.file && !flow.file) {
      throw new Error('no flow script: pass "file"');
    }
    const file = path.resolve(command.file ?? flow.file);
    const steps = await loadFlow(file);
    if (file !== flow.file) {
      flow.file = file;
      flow.next = 0;
    }
    return {
      steps: steps.map((step, index) => `${index + 1}. ${step.name}`),
      next: flow.next < steps.length ? flow.next + 1 : null,
    };
  },
  clearCaption: async () => {
    await updateFrame({ caption: null });
    return {};
  },
  /**
   * The take's title (`band: true` also keeps it as a band over the top after the open title): `value` / `subtitle`, and `open`
   * milliseconds (default 3000, 0 for none) to hold it as a centred panel first, as an opening title. `hold` waits
   * out the open title before returning. An empty `value` clears it.
   */
  title: async (command) => {
    const open = command.open ?? 3_000;
    if (options.captions !== 'off') {
      await updateFrame({
        header: command.value ? { title: command.value, subtitle: command.subtitle } : null,
        headerBand: command.band ?? false,
        open: command.value ? open : 0,
      });
    }
    if (command.hold) {
      await page.waitForTimeout(command.hold);
    }
    return { at: (Date.now() - started) / 1000 };
  },
  /**
   * Plays what follows at `factor` times speed in the cut (`factor: 1` returns to normal), for stretches
   * that are motion without content, like an agent working. A badge marks them, so the jump is not a lie.
   */
  speed: async (command) => {
    // A factor that is not a number would record as null and silently play at 1x under a broken badge.
    const requested = Math.round(Number(command.factor ?? 1));
    const factor = Number.isFinite(requested) ? Math.max(1, requested) : 1;
    speedChanges.push({ ms: Date.now() - started, factor });
    await page.evaluate(
      ({ id, factor }) => {
        document.getElementById(id)?.remove();
        if (factor === 1) {
          return;
        }
        const badge = document.createElement('div');
        badge.id = id;
        badge.style.cssText = [
          'position:fixed',
          'top:16px',
          'right:16px',
          'z-index:2147483647',
          'padding:6px 12px',
          'border-radius:999px',
          'background:rgba(17,17,17,0.85)',
          'color:#fff',
          'font:600 15px/1.2 ui-sans-serif,system-ui,sans-serif',
          'pointer-events:none',
        ].join(';');
        badge.textContent = `\u23e9 ${factor}\u00d7`;
        document.body.appendChild(badge);
      },
      { id: SPEED_ID, factor },
    );
    return { factor };
  },
  sleep: async (command) => {
    await page.waitForTimeout(command.ms ?? 1_000);
    return {};
  },
  screenshot: async (command) => {
    // `basename` because a caller-supplied name is not a path: `../` would escape the output directory.
    const file = path.join(options.out, path.basename(command.name ?? `shot-${Date.now()}.png`));
    await page.screenshot({ path: file, fullPage: !!command.fullPage });
    return { file };
  },
  stop: async () => {
    if (manual) {
      return { browser: 'left open; closing the window ends the driver' };
    }
    const timelineFile = path.join(options.out, 'timeline.json');
    // The flow file names the package it exercises, which the trimmer uses to name and place the upload.
    writeFileSync(
      timelineFile,
      JSON.stringify({ started, flow: flow.file, steps: timeline, speed: speedChanges }, null, 2),
    );
    let recorded;
    try {
      recorded = await recorder?.stop();
    } finally {
      // Also when the encode fails: the app, browser and log tap must not outlive the session.
      // Before the session closes: the polled tap drains once more and stops its timer.
      await logTap?.close();
      await context?.close();
      await browser?.close();
      await native?.close();
    }
    // `recorded.file` already carries the output directory; only the fallback's bare name needs it.
    const fallback = recorded ? undefined : readdirSync(options.out).find((entry) => entry.endsWith('.webm'));
    const video = recorded ? path.resolve(recorded.file) : fallback && path.resolve(options.out, fallback);
    return {
      video,
      size: `${viewport.width * scale}x${viewport.height * scale}`,
      timeline: timelineFile,
      steps: timeline.length,
      // The recorder kept writing, but what it wrote after this point is not the app.
      ...(recorded?.lost ? { lost: recorded.lost } : {}),
    };
  },
};

/** A command is a few hundred bytes; anything larger is a mistake or an attempt to exhaust the heap. */
const MAX_BODY = 64 * 1024;

const server = createServer((request, response) => {
  // Headers are complete before the first `data` event, so the token is checked before a single byte of
  // body is buffered — an unauthorized caller cannot make this process accumulate anything.
  if (request.headers[TOKEN_HEADER] !== token) {
    response.writeHead(403, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: `missing or bad ${TOKEN_HEADER}` }));
    return request.destroy();
  }

  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > MAX_BODY) {
      response.writeHead(413, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: `body exceeds ${MAX_BODY} bytes` }));
      request.destroy();
    }
  });
  request.on('end', async () => {
    if (request.destroyed) {
      return;
    }

    let command;
    try {
      command = JSON.parse(body || '{}');
    } catch (error) {
      response.writeHead(400, { 'content-type': 'application/json' });
      return response.end(JSON.stringify({ ok: false, error: `bad json: ${error.message}` }));
    }

    const handler = handlers[command.op];
    if (!handler) {
      response.writeHead(400, { 'content-type': 'application/json' });
      return response.end(
        JSON.stringify({ ok: false, error: `unknown op: ${command.op}`, ops: Object.keys(handlers) }),
      );
    }

    try {
      const result = await handler(command);
      // Serialized before the header goes out, so a result that cannot be stringified reaches the catch below.
      const body = JSON.stringify({ ok: true, ...result });
      response.writeHead(200, { 'content-type': 'application/json' });
      // Shutdown runs from the write callback: exiting as soon as `end` returns can cut the response
      // off before it flushes, and that response carries the video path.
      response.end(body, () => {
        if (command.op === 'stop' && !manual) {
          // Exit from inside `close`, and drop keep-alive sockets so it can actually complete: dropping
          // the exit entirely leaves the process alive on an idle client socket, and exiting before the
          // write callback truncates the response that carries the video path.
          server.close(() => process.exit(0));
          server.closeAllConnections();
        }
      });
    } catch (error) {
      // Errors are reported, never fatal: a failed gesture is a finding the agent acts on, and killing
      // the driver would lose the recording of the failure.
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: error.message?.split('\n').slice(0, 6).join('\n') }));
    }
  });
});

// Loopback only, and token-gated — this server drives a real browser and takes arbitrary `eval`.
server.listen(options.port, '127.0.0.1', () => {
  // Also written to the output directory so a caller can read it without scraping stdout.
  writeFileSync(path.join(options.out, 'token'), token);
  console.log(`driver ready on http://127.0.0.1:${options.port} out=${options.out} log=${logFile ?? 'off'}`);
  console.log(`token ${token}`);
});
