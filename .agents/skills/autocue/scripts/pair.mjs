#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Records two (or more) people using the app at once, each with their own identity, as one side-by-side video.
 *
 * Every peer is its own Playwright browser context, so each has separate storage (OPFS, IndexedDB,
 * localStorage) and therefore a separate HALO identity, while one Chromium process keeps the launch cheap.
 * Each page is recorded by `recorder.mjs` (2x VP9 from the screencast) and carries `overlay.mjs`'s cursor and
 * ripple. The recorders share one clock: they are cut at the same instant once the off-camera setup steps
 * end, and whatever residual skew remains is written to `timeline.json` and corrected by `compose.mjs`,
 * which tiles the panes and burns the step captions across the full width.
 *
 *   node pair.mjs --flow packages/apps/composer-app/autocue/two-peer-collaboration.mjs \
 *     --url http://127.0.0.1:4173 --out /tmp/pair [--peers Alice,Bob] [--scale 2] [--mp4 on]
 *
 * A flow exports `steps`: `{ name, setup?, caption?, run }`, where `run({ peers, caption, sleep })` gets each
 * peer by its lowercased name (`peers.alice.page`, `peers.alice.click(locator)`). Steps run in order; a
 * step's `name` is its caption unless it sets `caption: false` or captions itself.
 */

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { composeSideBySide } from './compose.mjs';
import { createOverlay } from './overlay.mjs';
import { hasFullFfmpeg, startRecorder } from './recorder.mjs';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    'url': 'http://127.0.0.1:4173',
    'out': 'pair-out',
    'peers': 'Alice,Bob',
    // Composer shows its navtree sidebar from 1024 CSS px (`lg`), the narrowest width that still reads as desktop.
    'width': 1024,
    'height': 900,
    'scale': 2,
    'fps': 25,
    'crf': 28,
    'quality': 92,
    'theme': 'dark',
    // A plank, not the sidebar: Composer's sidebar renders well before any space content does.
    'ready': '[data-testid="deck.plank"]',
    'ready-timeout': 180_000,
    // A cold dev server can serve the dedicated worker slower than the client's 15 s port timeout, which
    // fails the boot for good ("System Error"); a reload against the now-warm server boots.
    'boot-attempts': 3,
    // `serial` boots one peer at a time: two cold boots at once double the worker's module load.
    'boot': 'serial',
    // Boots a throwaway context first, so the peers load from a warm server and their first attempt counts.
    'warm': 'on',
    'action-timeout': 30_000,
    // Milliseconds between steps, so each one's result lands on screen before the next caption replaces it.
    'pace': 1_500,
    // Milliseconds the cursor rests on a target before the click, so a viewer sees what is about to be chosen.
    'dwell': 400,
    'mp4': 'off',
  };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].replace(/^--/, '');
    const value = args[index + 1];
    options[key] = /^[\d.]+$/.test(value) ? Number(value) : value;
  }
  if (!options.flow) {
    console.error('usage: pair.mjs --flow <flow.mjs> [--url <app>] [--out <dir>] [--peers Alice,Bob]');
    process.exit(2);
  }
  return options;
};

const options = parseArgs();
if (!hasFullFfmpeg()) {
  console.error('pair.mjs needs an ffmpeg with libvpx-vp9 on PATH (or FFMPEG_PATH): it records and composes with it');
  process.exit(1);
}
mkdirSync(options.out, { recursive: true });

// The cloud sandbox needs the pinned executable, the egress proxy, and a TLS 1.2 cap (see the `cloud-sandbox` skill).
const sandbox = process.env.CLAUDE_CODE_REMOTE ? process.env.HTTPS_PROXY : undefined;
const browser = await chromium.launch({
  headless: true,
  executablePath: sandbox ? '/opt/pw-browsers/chromium' : undefined,
  args: [
    ...(sandbox
      ? [
          '--no-sandbox',
          `--proxy-server=${sandbox}`,
          '--proxy-bypass-list=127.0.0.1;localhost',
          '--ssl-version-max=tls1.2',
        ]
      : []),
    // `deviceScaleFactor` alone leaves the screencast at CSS size; forcing it browser-wide makes the frames 2x.
    ...(options.scale !== 1 ? [`--force-device-scale-factor=${options.scale}`] : []),
  ],
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** What Composer logs, and shows, once client initialization has failed for good; only a reload recovers. */
const FATAL_CONSOLE = /client initialization failed|fatal dialog/;
const FATAL_TEXT = 'Refresh the page to continue';

/**
 * Loads the app and waits for `--ready`, reloading when the client fails to initialize.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
const bootPage = async (page, label) => {
  let fatal = false;
  const onConsole = (message) => {
    if (message.type() === 'error' && FATAL_CONSOLE.test(message.text())) {
      fatal = true;
    }
  };
  page.on('console', onConsole);
  try {
    for (let attempt = 1; attempt <= options['boot-attempts']; attempt++) {
      fatal = false;
      const started = Date.now();
      await (attempt === 1 ? page.goto(options.url) : page.reload());
      const deadline = started + options['ready-timeout'];
      while (Date.now() < deadline && !fatal) {
        if (
          await page
            .locator(options.ready)
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          console.error(`${label}: booted in ${Date.now() - started} ms (attempt ${attempt})`);
          return;
        }
        if (
          await page
            .getByText(FATAL_TEXT)
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          fatal = true;
          break;
        }
        await sleep(500);
      }
      console.error(`${label}: boot attempt ${attempt} ${fatal ? 'failed to initialize the client' : 'timed out'}`);
    }
    throw new Error(`${label}: did not boot after ${options['boot-attempts']} attempts (see the pane recording)`);
  } finally {
    page.off('console', onConsole);
  }
};

/**
 * One person: an isolated context (its own identity), a recorded page, and gestures that show the cursor.
 *
 * @param {string} name
 */
const createPeer = async (name) => {
  const viewport = { width: options.width, height: options.height };
  const context = await browser.newContext({ viewport, deviceScaleFactor: options.scale, colorScheme: options.theme });
  const page = await context.newPage();
  page.setDefaultTimeout(options['action-timeout']);
  const overlay = createOverlay(page, { enabled: true, feed: false });

  // The app logs invitation and auth codes as JSON to the console (as the e2e `AppManager` reads them), so a
  // flow can hand a code from one peer to the other without reading it off the screen.
  const consoleValues = new Map();
  const waiters = [];
  page.on('console', (message) => {
    const text = message.text();
    const start = text.indexOf('{');
    if (start < 0) {
      return;
    }
    try {
      const json = JSON.parse(text.slice(start));
      for (const [key, value] of Object.entries(json)) {
        consoleValues.set(key, value);
        waiters.filter((waiter) => waiter.key === key).forEach((waiter) => waiter.resolve(value));
      }
    } catch {}
  });

  const recorder = await startRecorder(page, {
    dir: path.join(options.out, name.toLowerCase()),
    file: path.join(options.out, `${name.toLowerCase()}.webm`),
    size: { width: options.width * options.scale, height: options.height * options.scale },
    fps: options.fps,
    crf: options.crf,
    quality: options.quality,
  });

  /** A selector string or a Locator. */
  const resolve = (target) => (typeof target === 'string' ? page.locator(target).first() : target);

  return {
    name,
    page,
    context,
    recorder,
    /** Moves the overlay cursor to the target, rests on it, ripples, then clicks for real. */
    click: async (target, clickOptions) => {
      const locator = resolve(target);
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      if (box) {
        const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await overlay.moveCursor(point);
        await sleep(options.dwell);
        await overlay.click(point);
      }
      await locator.click(clickOptions);
    },
    /** Types a character at a time so the text visibly arrives (and replicates) on camera. */
    type: async (text, { delay = 45 } = {}) => {
      await page.keyboard.type(text, { delay });
    },
    /**
     * Resolves with the next value the app logs under `key` (e.g. `invitationCode`, `authCode`). Call it before
     * the gesture that produces the value, or pass `latest: true` to accept one already logged.
     */
    nextConsoleValue: (key, { latest = false, timeout = 60_000 } = {}) => {
      if (latest && consoleValues.has(key)) {
        return Promise.resolve(consoleValues.get(key));
      }
      return new Promise((resolvePromise, reject) => {
        const timer = setTimeout(() => reject(new Error(`${name}: no "${key}" logged within ${timeout}ms`)), timeout);
        waiters.push({
          key,
          resolve: (value) => {
            clearTimeout(timer);
            resolvePromise(value);
          },
        });
      });
    },
  };
};

const names = options.peers.split(',').map((name) => name.trim());
const peerList = await Promise.all(names.map(createPeer));
const peers = Object.fromEntries(peerList.map((peer) => [peer.name.toLowerCase(), peer]));

const flow = await import(pathToFileURL(path.resolve(options.flow)).href);
const steps = flow.steps ?? [];

/** Caption timeline, in ms from the shared cut; empty until the take starts. */
const captions = [];
let takeStart;
const caption = (text, subtitle) => {
  if (takeStart !== undefined) {
    captions.push({ ms: Date.now() - takeStart, text, ...(subtitle ? { subtitle } : {}) });
  }
};

const stepsDir = path.join(options.out, 'steps');
mkdirSync(stepsDir, { recursive: true });

const results = [];
let failed = false;
try {
  // Booting is never the subject: it is cut with the setup steps. A failed boot is reported like a failed step, so the panes recorded so far still show why.
  const boot = async () => {
    if (options.warm === 'on') {
      const context = await browser.newContext({ viewport: { width: options.width, height: options.height } });
      // Only primes the server, so its own failure is not the take's.
      await bootPage(await context.newPage(), 'warm-up')
        .catch((error) => console.error(String(error?.message ?? error)))
        .finally(() => context.close());
    }
    if (options.boot === 'parallel') {
      await Promise.all(peerList.map((peer) => bootPage(peer.page, peer.name)));
    } else {
      for (const peer of peerList) {
        await bootPage(peer.page, peer.name);
      }
    }
  };
  await boot().catch((error) => {
    failed = true;
    results.push({ step: 0, name: 'boot', ok: false, error: String(error?.message ?? error) });
  });

  for (const [index, step] of (failed ? [] : steps).entries()) {
    const number = String(index + 1).padStart(2, '0');
    if (!step.setup && takeStart === undefined) {
      // One instant for every pane: the recorders restart their clocks together, so pane N's frame at t shows
      // the same wall-clock moment as pane 1's. Any skew between the calls is measured and composed away.
      peerList.forEach((peer) => peer.recorder.cut());
      takeStart = Math.min(...peerList.map((peer) => peer.recorder.started));
    }
    if (!step.setup && step.caption !== false) {
      caption(typeof step.caption === 'string' ? step.caption : step.name, step.subtitle);
    }
    const started = Date.now();
    try {
      await step.run({ peers, caption, sleep });
      results.push({ step: index + 1, name: step.name, ok: true, ms: Date.now() - started });
    } catch (error) {
      failed = true;
      results.push({ step: index + 1, name: step.name, ok: false, error: String(error?.message ?? error) });
    } finally {
      await Promise.all(
        peerList.map((peer) =>
          peer.page
            .screenshot({ path: path.join(stepsDir, `${number}-${peer.name.toLowerCase()}.png`) })
            .catch(() => {}),
        ),
      );
    }
    if (failed) {
      break;
    }
    if (!step.setup) {
      await sleep(step.pace ?? options.pace);
    }
  }
} finally {
  // `stop` is what writes each pane's video, so it runs even after a failure: the take up to the failing step
  // is the evidence of where it went wrong.
  const stopped = await Promise.all(peerList.map((peer) => peer.recorder.stop().catch((error) => ({ error }))));
  await browser.close();

  const base = takeStart ?? Math.min(...peerList.map((peer) => peer.recorder.started));
  // `steps` is `driver.mjs`'s caption shape, so `trim-static.mjs --timeline` can trim the composed video.
  const timeline = {
    started: base,
    peers: peerList.map((peer, index) => ({
      name: peer.name,
      file: stopped[index].file,
      offsetMs: peer.recorder.started - base,
    })),
    steps: captions,
    results,
  };
  writeFileSync(path.join(options.out, 'timeline.json'), JSON.stringify(timeline, null, 2));

  let composed;
  if (stopped.every((result) => result.file)) {
    composed = await composeSideBySide({
      inputs: timeline.peers.map(({ name, file, offsetMs }) => ({ file, label: name, offsetMs })),
      captions,
      out: path.join(options.out, 'side-by-side.webm'),
      fps: options.fps,
      mp4: options.mp4 === 'on',
    });
  }
  console.log(JSON.stringify({ ok: !failed, steps: results, timeline: timeline.peers, composed }, null, 2));
  process.exitCode = failed ? 1 : 0;
}
