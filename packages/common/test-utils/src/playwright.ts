//
// Copyright 2023 DXOS.org
//

/* eslint-disable no-console */

import {
  type Browser,
  type BrowserContext,
  type Page,
  type PlaywrightTestConfig,
  type ReporterDescription,
  devices,
} from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import pkgUp from 'pkg-up';

import { buildErrnoShim, errnoShimSupported } from './errno-shim.ts';
import { Lock } from './lock.ts';

/** Values that turn a boolean `DX_E2E_*` knob off; anything else, including unset, leaves it on. */
const DISABLED = new Set(['0', 'false']);

/** All three work around bugs in Playwright's WebKit; `webkit-workarounds.md` says how to retest and retire them. */
const webkitWorkarounds = (): boolean => !DISABLED.has(process.env.DX_E2E_WEBKIT_WORKAROUNDS ?? '');

const findWorkspaceRoot = (startDir: string): string => {
  let dir = resolve(startDir);
  while (dir !== '/') {
    try {
      // Check for pnpm-workspace.yaml first (modern pnpm approach)
      const workspaceYamlPath = join(dir, 'pnpm-workspace.yaml');
      if (existsSync(workspaceYamlPath)) {
        return dir;
      }

      // Check for package.json with workspaces field (legacy approach)
      const pkgPath = join(dir, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.workspaces) {
        return dir;
      }
    } catch {}
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  throw new Error('Could not find pnpm workspace root');
};

export const e2ePreset = (testDir: string): PlaywrightTestConfig => {
  const packageJson = pkgUp.sync({ cwd: testDir });
  const packageDir = packageJson!.split('/').slice(0, -1).join('/');
  const packageDirName = packageDir.split('/').pop();
  if (!packageDirName) {
    throw new Error('packageDirName not found');
  }

  const workspaceRoot = findWorkspaceRoot(packageDir);
  const testResultOuputDir = join(workspaceRoot, 'test-results/playwright/output', packageDirName);
  const reporterOutputFile = join(workspaceRoot, 'test-results/playwright/report', `${packageDirName}.json`);

  const browser = process.env.PLAYWRIGHT_BROWSER || (process.env.CI ? 'all' : 'chromium');
  const runsWebKit = browser === 'all' || browser === 'webkit';
  // In the Claude Code cloud sandbox chromium needs a pinned executable, the egress proxy passed via
  // ARGS (Playwright's `proxy:` option drops its bypass list for non-default contexts), and a TLS 1.2
  // cap (see the cloud-sandbox skill). Gated so real dev/CI runs are never silently downgraded.
  const sandboxProxy = process.env.CLAUDE_CODE_REMOTE ? process.env.HTTPS_PROXY : undefined;
  const sandboxChromium = sandboxProxy
    ? {
        launchOptions: {
          executablePath: '/opt/pw-browsers/chromium',
          args: [
            '--no-sandbox',
            `--proxy-server=${sandboxProxy}`,
            '--proxy-bypass-list=127.0.0.1;localhost',
            '--ssl-version-max=tls1.2',
          ],
        },
      }
    : {};
  const projects = [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...sandboxChromium },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    ...(runsWebKit
      ? [
          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              launchOptions: { env: webKitLaunchEnv(workspaceRoot) },
            },
          },
        ]
      : []),
  ].filter((project) => {
    return browser === 'all' || project.name === browser;
  });

  return {
    testDir,
    outputDir: testResultOuputDir,
    // Playwright's default is 30s, which equals the action bound below — leaving a test no budget beyond
    // a single slow action. Storybook-backed suites also pay an on-demand story compile in the first
    // test's `beforeEach`, which alone exceeded 30s. Individual configs may still raise this.
    timeout: 60_000,
    // Run tests in files in parallel.
    fullyParallel: true,
    // Fail the build on CI if you accidentally left test.only in the source code.
    forbidOnly: !!process.env.CI,
    // No retries anywhere: retrying hides flakes behind a 3x time cost, making shard timings unusable
    // for sizing the suite. A flake now fails loudly and gets skipped with a TODO instead.
    retries: 0,
    // 4 workers starved shared setup into false "not stable"/"detached" failures, so 2 is the
    // compromise. `|| 2`, not `??`: an env var set to the empty string (common in Actions) would
    // otherwise coerce to 0 workers.
    workers: Number(process.env.PLAYWRIGHT_WORKERS) || 2,
    // Reporter to use. See https://playwright.dev/docs/test-reporters.
    reporter: [
      ...(process.env.CI
        ? ([
            ['list'],
            [
              'json',
              {
                outputFile: reporterOutputFile,
              },
            ],
            ['junit', { outputFile: reporterOutputFile.replace(/\.json$/, '.xml') }],
          ] satisfies ReporterDescription[])
        : ([['list']] satisfies ReporterDescription[])),
    ],
    use: {
      trace: 'retain-on-failure',
      // Playwright's default is no limit, so a stuck locator would absorb the whole per-test budget and
      // report a bare `Test timeout` naming nothing.
      actionTimeout: 30_000,
    },
    projects,
  };
};

/** `process.env` without unset keys, the shape Playwright's launch `env` takes. */
const definedEnv = (): Record<string, string> => {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  return env;
};

/**
 * Environment for a WebKit launch. Replaces the browser's whole environment rather than extending it,
 * so it carries `process.env` alongside the two crash workarounds.
 */
const webKitLaunchEnv = (workspaceRoot: string): Record<string, string> => {
  // x86_64 Linux WebKit: every captured boot crash faulted in the wasm in-place interpreter (IPInt) with a corrupted
  // locals base or wasm PC.
  const disableWasmIPInt = webkitWorkarounds() && process.platform === 'linux' && process.arch === 'x64';
  const errnoShim =
    webkitWorkarounds() && errnoShimSupported()
      ? buildErrnoShim(join(workspaceRoot, 'node_modules/.cache/dxos-test-utils'))
      : undefined;
  return {
    ...(disableWasmIPInt ? { JSC_useWasmIPInt: 'false' } : {}),
    ...definedEnv(),
    ...(errnoShim ? { LD_PRELOAD: [errnoShim, process.env.LD_PRELOAD].filter(Boolean).join(':') } : {}),
  };
};

/**
 * WebKit keeps OPFS under the browser's data directory, and an ephemeral context has none, so every
 * `navigator.storage` call there fails and no app backed by OPFS boots. A persistent context has one.
 * Its temporary directory is per context, which keeps the isolation a fresh context gives.
 */
const createContext = async (browser: Browser): Promise<{ context: BrowserContext; page?: Page }> => {
  const browserType = browser.browserType();
  if (browserType.name() !== 'webkit' || !webkitWorkarounds()) {
    return { context: await browser.newContext() };
  }

  const userDataDir = mkdtempSync(join(tmpdir(), 'dxos-webkit-'));
  const context = await browserType.launchPersistentContext(userDataDir, {
    env: webKitLaunchEnv(findWorkspaceRoot(process.cwd())),
  });
  context.once('close', () => rmSync(userDataDir, { recursive: true, force: true }));
  // A persistent context opens with a page; taking it leaves no blank page behind.
  return { context, page: context.pages()[0] };
};

export type SetupOptions = {
  url?: string;
  bridgeLogs?: boolean;
  viewportSize?: Parameters<Page['setViewportSize']>[0];
};

/**
 * Opens a page, creating a context for it unless handed one to borrow.
 * `close()` disposes whatever this created: the context when it made one, otherwise just the page.
 */
export const setupPage = async (browser: Browser | BrowserContext, options: SetupOptions = {}) => {
  const { url, bridgeLogs, viewportSize } = options;

  const created = 'newContext' in browser ? await createContext(browser) : undefined;
  const context = created?.context ?? (browser as BrowserContext);
  const ownsContext = created !== undefined;
  let page: Page | undefined;

  // Playwright opens a trace chunk on every live context at test start, so a context left behind by a
  // closed page is re-serialized into every later trace in that worker.
  const close = async (): Promise<void> => {
    await (ownsContext ? context.close() : page?.close());
  };

  try {
    page = created?.page ?? (await context.newPage());

    if (viewportSize) {
      await page.setViewportSize(viewportSize);
    }

    // TODO(wittjosiah): Remove?
    if (bridgeLogs) {
      const lock = new Lock();

      page.on('pageerror', async (error) => {
        await lock.executeSynchronized(async () => {
          // eslint-disable-next-line no-console
          console.log(error);
        });
      });

      page.on('console', async (msg) => {
        try {
          const argsPromise = Promise.all(msg.args().map((x) => x.jsonValue()));
          await lock.executeSynchronized(async () => {
            const args = await argsPromise;

            if (args.length > 0) {
              console.log(...args);
            } else {
              console.log(msg);
            }
          });
        } catch (err) {
          console.error('Failed to parse message', err);
        }
      });
    }

    if (url) {
      await page.goto(url);
    }

    return { context, page, close };
  } catch (err) {
    // The caller never received `close`, so this is the only chance to dispose what got created. The
    // setup error is the one worth reporting, so a failure to clean up does not displace it.
    await close().catch(() => {});
    throw err;
  }
};

export const storybookUrl = (storyId: string, port = 9009) =>
  `http://localhost:${port}/iframe.html?id=${storyId}&viewMode=story`;

/**
 * Playwright `webServer` for a Storybook-backed suite. Readiness is probed by `url` rather than
 * `port` because a `port` probe is a bare TCP check, which `storybook dev` satisfies by binding the
 * socket before it can serve — tests starting in that gap get ERR_CONNECTION_REFUSED.
 */
export const storybookWebServer = (port: number) => ({
  command: `pnpm storybook dev --ci --quiet --port=${port} --config-dir=.storybook`,
  url: `http://localhost:${port}`,
  reuseExistingServer: false,
});
