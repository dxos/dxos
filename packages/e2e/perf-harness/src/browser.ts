//
// Copyright 2026 DXOS.org
//

import { type Browser, type BrowserContext, type Page, chromium } from '@playwright/test';

import { Cdp, browserEndpoint } from './cdp.ts';
import { PERF_HTTP2, partitionAllow } from './conditions.ts';
import { type PartitionProxy, partitionArgs, startPartitionProxy } from './partition.ts';

/**
 * Fixed rather than ephemeral, matching `scripts/memory/measure.mjs`: the port is also how that
 * script's `ps` filter finds the browser pid. `DX_PERF_DEBUG_PORT` moves it for a machine where
 * another worktree is measuring at the same time.
 */
export const DEBUG_PORT = Number.parseInt(process.env.DX_PERF_DEBUG_PORT ?? '', 10) || 9333;

export type InstrumentedBrowser = {
  browser: Browser;
  browserCdp: Cdp;
  browserPid: number;
  debugPort: number;
  /** Set when `--offline` or `--edge` partitioned the browser: what it was refused, and what it tunnelled. */
  partition?: PartitionProxy;
  close: () => Promise<void>;
};

/** One disk-backed context instead of a browser, for a flow whose storage has to sit on disk as installed. */
export type InstrumentedContext = Omit<InstrumentedBrowser, 'browser'> & { context: BrowserContext };

const startPartition = async (): Promise<PartitionProxy | undefined> => {
  const allow = partitionAllow();
  return allow ? startPartitionProxy({ allow }) : undefined;
};

const sandboxProxy = (): string | undefined => (process.env.CLAUDE_CODE_REMOTE ? process.env.HTTPS_PROXY : undefined);

const launchArgs = (partition: PartitionProxy | undefined): string[] => {
  // A partition replaces the sandbox's egress proxy: the flow needs no egress at all.
  const egress = partition ? undefined : sandboxProxy();
  return [
    `--remote-debugging-port=${DEBUG_PORT}`,
    // Stamps trace events with the instructions their thread retired, which the counter trace
    // sums per realm. A no-op where the kernel exposes no PMU (a VM without a perf driver), and
    // the rows say so with `instructionThreads: 0` rather than a misleading zero.
    '--enable-thread-instruction-count',
    // The HTTP/2 preview serves a self-signed certificate.
    ...(PERF_HTTP2 ? ['--ignore-certificate-errors'] : []),
    // V8 flags for an experiment (`DX_PERF_JS_FLAGS='--max-semi-space-size=1'`); a run with them is
    // not comparable to one without.
    ...(process.env.DX_PERF_JS_FLAGS ? [`--js-flags=${process.env.DX_PERF_JS_FLAGS}`] : []),
    ...(partition ? partitionArgs(partition.port) : []),
    ...(egress
      ? [
          '--no-sandbox',
          `--proxy-server=${egress}`,
          '--proxy-bypass-list=127.0.0.1;localhost',
          '--ssl-version-max=tls1.2',
        ]
      : []),
  ];
};

/**
 * Connects the browser-level CDP session and finds the browser pid, closing what was launched if
 * either fails: the caller only gets a handle it can close once this resolves, and a leaked browser
 * holds the fixed debug port the nightly's next serial tier would then fail to bind.
 */
const instrument = async (
  closeBrowser: () => Promise<void>,
  partition: PartitionProxy | undefined,
): Promise<Omit<InstrumentedBrowser, 'browser'>> => {
  try {
    const browserCdp = await Cdp.connect(await browserEndpoint(DEBUG_PORT));
    // Playwright does not expose the browser pid, and the RSS reading needs the root of the process
    // tree. The debug-port flag is unique to this launch, so the command line identifies it.
    const browserPid = await resolveBrowserPid();
    return {
      browserCdp,
      browserPid,
      debugPort: DEBUG_PORT,
      ...(partition ? { partition } : {}),
      close: async () => {
        browserCdp.close();
        await closeBrowser();
        await partition?.close();
      },
    };
  } catch (error) {
    await closeBrowser().catch(() => {});
    await partition?.close();
    throw error;
  }
};

/**
 * Launches chromium with a remote debugging port and connects the browser-level CDP session.
 *
 * Launched here rather than taken from Playwright's `browser` fixture because the harness needs
 * the debug port: Playwright's own CDP wrapper cannot attach to a shared worker, and the shared
 * worker is where ECHO does its work. The port also carries `SystemInfo.getProcessInfo`, which is
 * browser-scoped and therefore unreachable from a page session.
 *
 * In the Claude Code cloud sandbox chromium needs a pinned executable and the egress proxy, the
 * same conditions `e2ePreset` applies - restated because that preset configures Playwright's
 * fixture, which this deliberately bypasses.
 */
export const launchInstrumentedBrowser = async (): Promise<InstrumentedBrowser> => {
  const partition = await startPartition();
  const browser = await chromium.launch({
    headless: true,
    ...(sandboxProxy() ? { executablePath: '/opt/pw-browsers/chromium' } : {}),
    args: launchArgs(partition),
  });
  return { browser, ...(await instrument(() => browser.close(), partition)) };
};

/**
 * The same instrumented chromium with one persistent context in `userDataDir`. Playwright's other
 * contexts keep storage in memory, which would count a large OPFS database as renderer memory.
 */
export const launchInstrumentedContext = async (userDataDir: string): Promise<InstrumentedContext> => {
  const partition = await startPartition();
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    ...(sandboxProxy() ? { executablePath: '/opt/pw-browsers/chromium' } : {}),
    args: launchArgs(partition),
  });
  return { context, ...(await instrument(() => context.close(), partition)) };
};

const resolveBrowserPid = async (): Promise<number> => {
  const { execFileSync } = await import('node:child_process');
  const output = execFileSync('ps', ['-ax', '-o', 'pid=,command='], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  for (const line of output.split('\n')) {
    if (line.includes(`--remote-debugging-port=${DEBUG_PORT}`) && !line.includes('--type=')) {
      return Number(line.trim().split(/\s+/)[0]);
    }
  }
  // Zero reads as "no RSS measured" downstream rather than silently attributing the whole machine.
  return 0;
};

/**
 * PostHog captures nothing from a browser it takes for a bot: an automated `navigator.webdriver`, or
 * "HeadlessChrome" in the user agent or its brands. A `--telemetry` run presents as the browser a
 * person runs, so analytics, exception capture and replay behave as shipped; the sink is its only
 * destination. Call before the first navigation.
 */
export const presentAsPersonsBrowser = async (context: BrowserContext, page: Page): Promise<void> => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
  });
  // The user agent override goes through CDP, which only Chromium speaks.
  const session = await context.newCDPSession(page).catch(() => undefined);
  if (!session) {
    return;
  }
  const { product, userAgent } = await session.send('Browser.getVersion');
  const fullVersion = product.split('/')[1] ?? '';
  const major = fullVersion.split('.')[0] ?? '';
  await session.send('Emulation.setUserAgentOverride', {
    userAgent: userAgent.replace('HeadlessChrome', 'Chrome'),
    userAgentMetadata: {
      brands: [
        { brand: 'Google Chrome', version: major },
        { brand: 'Chromium', version: major },
        { brand: 'Not=A?Brand', version: '24' },
      ],
      fullVersion,
      platform: 'macOS',
      platformVersion: '',
      architecture: 'arm',
      model: '',
      mobile: false,
    },
  });
};
