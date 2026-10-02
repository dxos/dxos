//
// Copyright 2026 DXOS.org
//

/**
 * Starts the native Tauri app under WebDriver and answers a Playwright-shaped `page` for it.
 *
 * On Linux the chain is the one Tauri documents for testing: `tauri-driver` accepts a session whose
 * `tauri:options.application` names the app binary and hands it to `WebKitWebDriver` (the `webkit2gtk-driver`
 * package). With no `DISPLAY` (the cloud sandbox, CI) the app runs on its own Xvfb screen exactly the window's
 * size, so the screen is the window and the recorder captures nothing but the app.
 *
 * macOS has no WebDriver for WKWebView, so the app serves one itself: a build with the `webdriver` cargo feature
 * embeds `tauri-plugin-wdio-webdriver`, which listens on `TAURI_WEBDRIVER_PORT`. Its actions are bare mouse and
 * key events, so the page dispatches input itself (`input.mjs`), and the recorder takes the webview's snapshots.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

import { createTauriPage } from './page.mjs';
import { startSnapshotRecorder, startX11Recorder } from './recorder.mjs';
import { createSession } from './webdriver.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const which = (command) => {
  const result = spawnSync('which', [command], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : undefined;
};

/** The first of `candidates` on disk or on `PATH`. */
const locate = (...candidates) =>
  candidates
    .map((candidate) => (candidate.includes('/') ? candidate : which(candidate)))
    .find((found) => found && existsSync(found));

const waitForHttp = async (url, timeout, what) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Not listening yet.
    }
    await sleep(200);
  }
  throw new Error(`${what} did not answer on ${url} within ${timeout}ms`);
};

/** A free X display number: the lock file Xvfb writes is the only reliable sign one is taken. */
const freeDisplay = () => {
  for (let number = 99; number < 200; number++) {
    if (!existsSync(`/tmp/.X${number}-lock`)) {
      return `:${number}`;
    }
  }
  throw new Error('no free X display between :99 and :199');
};

/**
 * Strings only an automation build carries: its identifier, and the env var its embedded WebDriver reads. A
 * release binary has no Info.plist to ask, and launching one under a shipped identifier would open that
 * channel's real profile, so the binary is searched before it runs.
 */
const TEST_IDENTIFIER = 'org.dxos.composer.test';
const WEBDRIVER_MARKER = 'TAURI_WEBDRIVER_PORT';

/** The WebKit data store a `webdriver` build keeps its web storage in (`data_store_identifier` in `src-tauri/src/lib.rs`). */
const DATA_STORE = '6175746f-6375-6500-0000-000000000001';

/**
 * Everything a test build stores: its web storage, inside the WebKit container named after the executable
 * (shared with every other unbundled build, so only the test store is named), and its app data and caches.
 */
const testProfile = (app) => {
  const library = path.join(homedir(), 'Library');
  return [
    path.join(library, 'WebKit', path.basename(app), 'WebsiteDataStore', DATA_STORE),
    path.join(library, 'Application Support', TEST_IDENTIFIER),
    path.join(library, 'Caches', TEST_IDENTIFIER),
  ];
};

/**
 * @param {{
 *   app: string,
 *   width: number,
 *   height: number,
 *   scale: number,
 *   theme: 'dark' | 'light',
 *   port: number,
 *   headed: boolean,
 *   proxy?: string,
 *   log?: string,
 *   fresh?: boolean,
 *   onExit: (reason: string) => void,
 * }} options
 */
export const launchTauri = async (options) =>
  process.platform === 'darwin' ? launchEmbedded(options) : launchLinux(options);

/** macOS: the app's own embedded WebDriver server. */
const launchEmbedded = async ({ app, width, height, theme, port, log, fresh, onExit }) => {
  if (!existsSync(app)) {
    throw new Error(`no app binary at ${app}; build it with \`moon run composer-app:tauri-build-test\``);
  }
  const binary = readFileSync(app);
  for (const [marker, missing] of [
    [TEST_IDENTIFIER, `is not a test build (no ${TEST_IDENTIFIER}), so it would run on a real profile`],
    [WEBDRIVER_MARKER, 'has no embedded WebDriver (the `webdriver` cargo feature)'],
  ]) {
    if (!binary.includes(marker)) {
      throw new Error(`${app} ${missing}; build it with \`moon run composer-app:tauri-build-test\``);
    }
  }
  const server = `http://127.0.0.1:${port}`;
  // Another app's server on the port would take the session, and drive that app instead.
  if (
    await fetch(`${server}/status`).then(
      () => true,
      () => false,
    )
  ) {
    throw new Error(`something already answers WebDriver on ${server}: quit it, or pass --driver-port`);
  }

  // A first-run take: a new identity, no window state, no plugins switched on by an earlier run.
  if (fresh) {
    for (const dir of testProfile(app)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  let closing = false;
  const output = log ? createWriteStream(log) : 'ignore';
  const child = spawn(
    app,
    // AppKit reads this from the argument domain first, so the app's appearance (and the page's
    // `prefers-color-scheme`) follows `--theme`, not the system's.
    ['-AppleInterfaceStyle', theme === 'dark' ? 'Dark' : 'Light'],
    { env: { ...process.env, TAURI_WEBDRIVER_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (output !== 'ignore') {
    child.stdout.pipe(output);
    child.stderr.pipe(output);
  } else {
    child.stdout.resume();
    child.stderr.resume();
  }
  // The app is not detached, but nothing ends it when the driver dies; a leftover holds the channel's port.
  const reap = () => child.kill('SIGTERM');
  const interrupted = (signal) => {
    reap();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  process.on('exit', reap).on('SIGINT', interrupted).on('SIGTERM', interrupted);
  let exited;
  child.on('exit', (code, signal) => {
    process.off('exit', reap).off('SIGINT', interrupted).off('SIGTERM', interrupted);
    exited = `the app exited (code ${code}, signal ${signal})`;
    if (!closing) {
      onExit(exited);
    }
  });

  let session;
  const abort = async (error) => {
    closing = true;
    await session?.close();
    child.kill('SIGTERM');
    throw error;
  };
  try {
    // The server answers before the window exists; `ready` is the window.
    const ready = Date.now() + 30_000;
    for (;;) {
      if (exited) {
        throw new Error(`${exited} before its WebDriver server was ready${log ? `; see ${log}` : ''}`);
      }
      const status = await fetch(`${server}/status`)
        .then((response) => response.json())
        .catch(() => undefined);
      if (status?.value?.ready) {
        break;
      }
      if (Date.now() > ready) {
        throw new Error(`the app's WebDriver server was not ready on ${server} within 30s`);
      }
      await sleep(200);
    }
    // The plugin otherwise takes whichever window its map yields first; the spotlight panel is a window too.
    session = await createSession(server, { 'wdio:tauriServiceOptions': { windowLabel: 'main' } });
    await session.setTimeouts({ script: 120_000, pageLoad: 300_000, implicit: 0 });
    // The window restores the size it last closed at; the recording is the viewport asked for.
    await session.setWindowRect({ width, height });
    // The window exists before its first navigation, at `about:blank`.
    while (!/^https?:/.test(await session.url().catch(() => ''))) {
      if (exited || Date.now() > ready) {
        throw new Error(exited ?? 'the app did not load its page within 30s');
      }
      await sleep(200);
    }
  } catch (error) {
    await abort(error);
  }

  const page = createTauriPage({ session, input: 'script' });
  page.currentUrl = await session.url().catch(() => 'about:blank');

  const close = async () => {
    closing = true;
    await session.close();
    child.kill('SIGTERM');
  };

  const record = ({ dir, file, size, fps, crf }) =>
    startSnapshotRecorder({
      snapshot: async () => Buffer.from(await session.frame(), 'base64'),
      dir,
      file,
      size,
      fps,
      crf,
    });

  return { page, session, close, record };
};

/** Linux: tauri-driver and WebKitWebDriver, on an Xvfb screen unless headed. */
const launchLinux = async ({ app, width, height, scale, theme, port, headed, proxy, fresh, onExit }) => {
  if (fresh) {
    console.warn('--fresh is macOS only; on Linux delete ~/.local/share/org.dxos.composer instead');
  }
  if (!existsSync(app)) {
    throw new Error(`no app binary at ${app}; build it with \`cargo build --release\` in src-tauri`);
  }
  const tauriDriver = locate(
    process.env.TAURI_DRIVER ?? 'tauri-driver',
    path.join(homedir(), '.cargo/bin/tauri-driver'),
  );
  if (!tauriDriver) {
    throw new Error('tauri-driver not found: `cargo install tauri-driver --locked`');
  }
  const nativeDriver = locate(process.env.NATIVE_DRIVER ?? 'WebKitWebDriver', '/usr/bin/WebKitWebDriver');
  if (!nativeDriver) {
    throw new Error('WebKitWebDriver not found: install the `webkit2gtk-driver` package');
  }

  const children = [];
  let closing = false;
  let session;
  // A launch that fails partway must not leave Xvfb or tauri-driver holding the display and port for the next one.
  const abort = async (error) => {
    closing = true;
    await session?.close();
    for (const child of children.toReversed()) {
      child.kill('SIGTERM');
    }
    throw error;
  };
  const watch = (child, name) => {
    children.push(child);
    child.on('exit', (code, signal) => {
      if (!closing) {
        onExit(`${name} exited (code ${code}, signal ${signal})`);
      }
    });
    return child;
  };

  // The screen is sized to the window in device pixels, so the capture is the app and nothing else.
  let display = headed ? process.env.DISPLAY : undefined;
  const virtual = !display;
  if (!display) {
    if (!which('Xvfb')) {
      throw new Error('no DISPLAY and no Xvfb: install `xvfb`, or pass --headed on a desktop session');
    }
    display = freeDisplay();
    watch(
      spawn('Xvfb', [display, '-screen', '0', `${width * scale}x${height * scale}x24`, '-nolisten', 'tcp'], {
        stdio: 'ignore',
      }),
      'Xvfb',
    );
    const lock = `/tmp/.X${display.slice(1)}-lock`;
    for (let attempt = 0; attempt < 50 && !existsSync(lock); attempt++) {
      await sleep(100);
    }
    if (!existsSync(lock)) {
      await abort(new Error(`Xvfb did not start on ${display}`));
    }
  }

  const env = {
    ...process.env,
    DISPLAY: display,
    // WebKitGTK reads the scale from GDK; the CSS viewport stays `width`x`height` while it renders at 2x.
    GDK_SCALE: String(scale),
    // `prefers-color-scheme` in WebKitGTK follows the GTK theme's variant.
    GTK_THEME: theme === 'dark' ? 'Adwaita:dark' : 'Adwaita',
    // Xvfb has no GPU: Mesa's software rasterizer serves WebKit's GL. `WEBKIT_DISABLE_DMABUF_RENDERER` must NOT be
    // set — its fallback segfaults the app in AcceleratedBackingStore::update the first time a page composites,
    // and WebKitGTK 2.52 no longer honours `WEBKIT_DISABLE_COMPOSITING_MODE`.
    ...(virtual ? { LIBGL_ALWAYS_SOFTWARE: '1' } : {}),
    ...(proxy
      ? {
          // libsoup takes the proxy from GLib's environment resolver, which reads the lower-case names. The
          // environment's own exclusions stay: the sandbox helper's network proxy reads them too, and a host the
          // egress proxy expects to be reached directly (a package registry) is refused through it.
          https_proxy: proxy,
          http_proxy: proxy,
          no_proxy: [process.env.NO_PROXY ?? process.env.no_proxy, 'localhost,127.0.0.1,::1'].filter(Boolean).join(','),
        }
      : {}),
  };

  const driverPort = port;
  watch(
    spawn(
      tauriDriver,
      ['--port', String(driverPort), '--native-port', String(driverPort + 1), '--native-driver', nativeDriver],
      {
        env,
        stdio: ['ignore', 'inherit', 'inherit'],
      },
    ),
    'tauri-driver',
  );
  try {
    await waitForHttp(`http://127.0.0.1:${driverPort}/status`, 15_000, 'tauri-driver');
    session = await createSession(`http://127.0.0.1:${driverPort}`, { 'tauri:options': { application: app } });
    await session.setTimeouts({ script: 120_000, pageLoad: 300_000, implicit: 0 });
  } catch (error) {
    await abort(error);
  }
  // No window manager on Xvfb, so the window keeps whatever it restored from the last run; pin it.
  await session.setWindowRect({ x: 0, y: 0, width, height }).catch((error) => {
    console.warn(`could not size the window: ${error.message}`);
  });

  const page = createTauriPage({ session });
  page.currentUrl = await session.url().catch(() => 'about:blank');

  const close = async () => {
    closing = true;
    await session.close();
    for (const child of children.toReversed()) {
      child.kill('SIGTERM');
    }
  };

  const record = ({ dir, file, size, fps, crf }) => startX11Recorder({ display, dir, file, size, fps, crf });

  return { page, session, close, record };
};
