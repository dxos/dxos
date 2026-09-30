//
// Copyright 2026 DXOS.org
//

/**
 * Starts the native Tauri app under WebDriver and answers a Playwright-shaped `page` for it.
 *
 * The chain is the one Tauri documents for testing: `tauri-driver` accepts a session whose
 * `tauri:options.application` names the app binary and hands it to the platform's native driver —
 * `WebKitWebDriver` on Linux (the `webkit2gtk-driver` package), `msedgedriver` on Windows. macOS has no
 * WebDriver for WKWebView, so there is no native route there.
 *
 * With no `DISPLAY` (the cloud sandbox, CI) the app runs on its own Xvfb screen exactly the window's size,
 * so the screen is the window and the recorder captures nothing but the app.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

import { createTauriPage } from './page.mjs';
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
 * @param {{
 *   app: string,
 *   width: number,
 *   height: number,
 *   scale: number,
 *   theme: 'dark' | 'light',
 *   port: number,
 *   headed: boolean,
 *   proxy?: string,
 *   onExit: (reason: string) => void,
 * }} options
 */
export const launchTauri = async ({ app, width, height, scale, theme, port, headed, proxy, onExit }) => {
  if (process.platform === 'darwin') {
    throw new Error(
      'macOS has no WebDriver for WKWebView, so tauri-driver cannot drive the app there (Linux or Windows only)',
    );
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

  return { page, display, session, close };
};
