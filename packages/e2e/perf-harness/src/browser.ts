//
// Copyright 2026 DXOS.org
//

import { type Browser, chromium } from '@playwright/test';

import { Cdp, browserEndpoint } from './cdp.ts';

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
  close: () => Promise<void>;
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
 * same conditions `e2ePreset` applies — restated because that preset configures Playwright's
 * fixture, which this deliberately bypasses.
 */
export const launchInstrumentedBrowser = async (): Promise<InstrumentedBrowser> => {
  const sandboxProxy = process.env.CLAUDE_CODE_REMOTE ? process.env.HTTPS_PROXY : undefined;
  const browser = await chromium.launch({
    headless: true,
    ...(sandboxProxy ? { executablePath: '/opt/pw-browsers/chromium' } : {}),
    args: [
      `--remote-debugging-port=${DEBUG_PORT}`,
      // V8 flags for an experiment (`DX_PERF_JS_FLAGS='--max-semi-space-size=1'`); a run with them is
      // not comparable to one without.
      ...(process.env.DX_PERF_JS_FLAGS ? [`--js-flags=${process.env.DX_PERF_JS_FLAGS}`] : []),
      ...(sandboxProxy
        ? [
            '--no-sandbox',
            `--proxy-server=${sandboxProxy}`,
            '--proxy-bypass-list=127.0.0.1;localhost',
            '--ssl-version-max=tls1.2',
          ]
        : []),
    ],
  });

  // Everything between the launch and the return is wrapped: the caller only gets a handle it can
  // close once this resolves, so a throw here would leak the browser — and it holds the fixed debug
  // port, which the nightly's NEXT serial tier would then fail to bind.
  let browserCdp: Cdp;
  let browserPid: number;
  try {
    browserCdp = await Cdp.connect(await browserEndpoint(DEBUG_PORT));
    // Playwright does not expose the browser pid, and the RSS reading needs the root of the process
    // tree. The debug-port flag is unique to this launch, so the command line identifies it.
    browserPid = await resolveBrowserPid();
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }

  return {
    browser,
    browserCdp,
    browserPid,
    debugPort: DEBUG_PORT,
    close: async () => {
      browserCdp.close();
      await browser.close();
    },
  };
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
