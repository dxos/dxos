//
// Copyright 2026 DXOS.org
//

/**
 * Builds a persistent browser profile holding several spaces of real data, so the memory
 * scripts can measure a loaded tab rather than an empty one.
 *
 * Every number in `.agents/projects/memory-usage/ALLOCATION.md` before this existed came
 * from a fresh profile with nothing open, which is not the state anyone complains about.
 *
 * Runs the nightly's own `createProjectsFixture`, so the data here and the data behind the
 * perf trend have the same shape. The fixture takes a Playwright `Page` only to call
 * `page.evaluate`, so a two-line shim over raw CDP stands in for one — which keeps
 * Playwright out of the profile the measuring run will reuse.
 *
 * Seeds with the same Electron build `native-heap.mjs` measures with, because a profile is
 * only guaranteed readable by the Chromium that wrote it.
 *
 * Usage: node seed-profile.mjs <url> --profile <dir> [--spaces 3] [--electron <Electron.app>]
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const url = process.argv[2]?.startsWith('--') ? 'http://localhost:4173' : (process.argv[2] ?? 'http://localhost:4173');
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt;
};
const profileDir = path.resolve(arg('--profile', './tmp/loaded-profile'));
const spaces = parseInt(arg('--spaces', '3'), 10);
const electronRoot = arg('--electron', process.env.ELECTRON_APP ?? './tmp/electron/Electron.app');
const port = parseInt(process.env.SEED_PORT ?? '9461', 10);

const electronBin = path.join(electronRoot, 'Contents/MacOS/Electron');
if (!existsSync(electronBin)) {
  console.error(`no Electron at ${electronBin} — run scripts/memory/fetch-electron.sh`);
  process.exit(1);
}

class Cdp {
  #ws;
  #id = 0;
  #pending = new Map();

  static async connect(wsUrl) {
    const cdp = new Cdp();
    cdp.#ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      cdp.#ws.addEventListener('open', resolve, { once: true });
      cdp.#ws.addEventListener('error', reject, { once: true });
    });
    cdp.#ws.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      const entry = cdp.#pending.get(message.id);
      if (entry) {
        cdp.#pending.delete(message.id);
        message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result);
      }
    });
    cdp.#ws.addEventListener('close', () => {
      for (const { reject } of cdp.#pending.values()) {
        reject(new Error('CDP socket closed'));
      }
      cdp.#pending.clear();
    });
    return cdp;
  }

  send(method, params = {}, timeoutMs = 600_000) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      timer.unref?.();
      this.#pending.set(id, {
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
      });
      this.#ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

mkdirSync(profileDir, { recursive: true });
const appDir = mkdtempSync(path.join(tmpdir(), 'seed-profile-app-'));
writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({ main: 'main.js', name: 'seed', version: '1.0.0' }));
writeFileSync(
  path.join(appDir, 'main.js'),
  `const { app, BrowserWindow } = require('electron');
app.setPath('userData', process.env.SEED_PROFILE);
app.commandLine.appendSwitch('remote-debugging-port', process.env.SEED_PORT);
app.whenReady().then(() => {
  new BrowserWindow({
    show: false,
    width: 1440,
    height: 900,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false },
  }).loadURL('about:blank');
});
app.on('window-all-closed', () => app.quit());
`,
);

const child = spawn(electronBin, [appDir], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, SEED_PORT: String(port), SEED_PROFILE: profileDir },
});
let childLog = '';
child.stdout.on('data', (chunk) => (childLog += chunk));
child.stderr.on('data', (chunk) => (childLog += chunk));
child.on('error', (error) => {
  console.error(`could not run ${electronBin}: ${error.message}`);
  rmSync(appDir, { force: true, recursive: true });
  process.exit(1);
});

let cleaned = false;
/** Graceful, because the profile is the output: a SIGKILL can lose the last IDB writes. */
const shutdown = async () => {
  if (cleaned) {
    return;
  }
  cleaned = true;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 10_000).unref?.()),
  ]);
  child.kill('SIGKILL');
  rmSync(appDir, { force: true, recursive: true });
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    void shutdown().then(() => process.exit(130));
  });
}

try {
  let version;
  for (let i = 0; i < 60 && !version; i++) {
    version = await fetch(`http://127.0.0.1:${port}/json/version`)
      .then((response) => response.json())
      .catch(() => undefined);
    if (!version) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!version) {
    throw new Error(`Electron never opened a debugger port\n${childLog.slice(0, 2000)}`);
  }

  let target;
  for (let i = 0; i < 40 && !target; i++) {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`)
      .then((response) => response.json())
      .catch(() => []);
    target = targets.find((candidate) => candidate.type === 'page');
    if (!target) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!target) {
    throw new Error(`no page target\n${childLog.slice(0, 2000)}`);
  }

  const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  console.error(`${version.Browser} — seeding ${spaces} space(s) into ${profileDir}`);
  await cdp.send('Page.navigate', { url });

  /** Stands in for a Playwright `Page` for the one method the fixture uses. */
  const page = {
    evaluate: async (fn, input) => {
      const { exceptionDetails, result } = await cdp.send('Runtime.evaluate', {
        awaitPromise: true,
        expression: `(${fn.toString()})(${JSON.stringify(input)})`,
        returnByValue: true,
      });
      if (exceptionDetails) {
        throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      }
      return result.value;
    },
  };

  // Ready is the account control, the same signal the e2e suite waits on; the operation
  // registry is not populated until well after the first paint.
  const deadline = Date.now() + 240_000;
  for (;;) {
    const ready = await page.evaluate(
      () =>
        Boolean(globalThis.composer?.invoke) && Boolean(document.querySelector('[data-testid="treeView.userAccount"]')),
      null,
    );
    if (ready) {
      break;
    }
    if (Date.now() > deadline) {
      throw new Error('the app never became ready');
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const { SCALE, createProjectsFixture, scaleLabel } = await import('../../src/playwright/perf/fixture.ts');
  console.error(`  scale per space: ${scaleLabel(SCALE)}`);
  const fixtures = [];
  for (let index = 0; index < spaces; index++) {
    const started = Date.now();
    const fixture = await createProjectsFixture(page, SCALE, `seed-${Date.now()}-${index}`);
    fixtures.push(fixture);
    console.error(
      `  space ${index + 1}/${spaces}: ${fixture.spaceId} — ${fixture.taskCount} tasks, ` +
        `${fixture.documentCount} documents, ${Math.round((Date.now() - started) / 1000)}s`,
    );
  }

  // Written beside the profile so the measuring run opens these objects rather than
  // guessing at ids it cannot know.
  const manifest = path.join(profileDir, 'fixture.json');
  writeFileSync(manifest, JSON.stringify({ fixtures, scale: SCALE, url }, null, 2));
  console.log(`\nseeded ${fixtures.length} spaces, manifest at ${manifest}`);
  console.log('let the app settle before quitting, so the last writes reach storage ...');
  await new Promise((resolve) => setTimeout(resolve, 20_000));
} finally {
  await shutdown();
}
