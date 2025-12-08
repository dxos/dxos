//
// Copyright 2023 DXOS.org

import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { join } from 'node:path';

import type { BrowserContext, BrowserType } from 'playwright';

import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { CONSOLE_PROCESSOR, LogLevel, type LogProcessor, createFileProcessor, log } from '@dxos/log';
import { trim } from '@dxos/util';

import { type GlobalOptions, type Platform, type ReplicantParams, type ReplicantRuntimeParams } from './spec';

const DEBUG_PORT_START = 9229;

export type ProcessHandle = {
  /**
   * Kill the replicant process/browser.
   */
  kill: (signal?: NodeJS.Signals | number) => void;
};

export type RunParams = {
  replicantParams: ReplicantParams;
  options: GlobalOptions;
};

export const runNode = (params: RunParams): ProcessHandle => {
  const execArgv = [...process.execArgv];

  if (params.options.profile) {
    execArgv.push(
      '--cpu-prof',
      '--cpu-prof-dir',
      params.replicantParams.outDir,
      '--cpu-prof-name',
      `replicant-${params.replicantParams.replicantId}.cpuprofile`,
    );
  }
  if (params.options.debug) {
    execArgv.push('--inspect=:' + (DEBUG_PORT_START + params.replicantParams.replicantId));
  }

  // Node CLI expects options before the script path.
  const childProcess = spawn(process.execPath, [...execArgv, process.argv[1]], {
    env: { ...process.env, DX_RUN_PARAMS: JSON.stringify(params) },
  });
  childProcess.on('error', (err) => {
    log.info('child process error', { err });
  });
  childProcess.on('exit', async (exitCode, signal) => {
    if (exitCode == null) {
      log.warn('agent exited with signal', { signal });
    } else if (exitCode !== 0) {
      log.warn('agent exited with non-zero exit code', { exitCode });
    }
  });

  return {
    kill: (signal?: NodeJS.Signals | number) => {
      log.trace('dxos.blade-runner.kill-replicant', { signal });
      childProcess.kill(signal);
    },
  };
};

export const runBrowser = async ({ replicantParams, options }: RunParams): Promise<ProcessHandle> => {
  const ctx = new Context();

  const start = Date.now();
  invariant(replicantParams.runtime.platform);

  const { page, context } = await getNewBrowserContext(replicantParams.runtime, {
    headless: options.headless ?? true,
  });
  ctx.onDispose(async () => {
    await page.close();
    await context.close();
  });

  page.on('crash', () => {
    log.error('page crashed');
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      log.error('page console error', { msg });
    }
  });
  page.on('pageerror', (error) => {
    log.error('page error', { error });
  });

  const fileProcessor = createFileProcessor({
    pathOrFd: replicantParams.logFile,
    levels: [LogLevel.ERROR, LogLevel.WARN, LogLevel.VERBOSE, LogLevel.INFO, LogLevel.TRACE],
  });

  const apis: EposedApis = {
    dx_runner_done: (signal?: NodeJS.Signals | number) => {
      log.trace('dxos.blade-runner.kill-replicant', { signal });
      void ctx.dispose();
    },
    // Expose log hook for playwright.
    dx_runner_log: (config, entry) => {
      fileProcessor(config, entry);
      CONSOLE_PROCESSOR(config, entry);
    },
  };

  for (const [name, fn] of Object.entries(apis)) {
    await page.exposeFunction(name, fn);
  }

  const server = await servePage({
    '/index.html': {
      contentType: 'text/html',
      data: trim`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Browser-Mocha</title>
        </head>
        <body>
          <h1>TESTING TESTING.</h1>
          <script>
            window.DX_RUN_PARAMS = ${JSON.stringify(JSON.stringify({ replicantParams, options }))}
          </script>
          <script type="module" src="index.js"></script>
        </body>
        </html>
      `,
    },
    '/index.js': {
      contentType: 'text/javascript',
      data: await readFile(join(replicantParams.planRunDir, 'artifacts', 'browser.js'), 'utf8'),
    },
  });

  ctx.onDispose(() => {
    server.close();
  });

  const port = (server.address() as AddressInfo).port;
  await page.goto(`http://localhost:${port}`, { timeout: 0 });

  log.info('browser started and page loaded', {
    replicantId: replicantParams.replicantId,
    time: Date.now() - start,
  });

  return {
    kill: apis.dx_runner_done,
  };
};

const getBrowser = async (browserType: Platform): Promise<BrowserType> => {
  const { chromium, firefox, webkit } = await import('playwright');
  switch (browserType) {
    case 'chromium':
      return chromium;
    case 'firefox':
      return firefox;
    case 'webkit':
      return webkit;
    default:
      throw new Error(`Unsupported browser: ${browserType}`);
  }
};

const getNewBrowserContext = async ({ platform, userDataDir }: ReplicantRuntimeParams, options: BrowserOptions) => {
  invariant(platform, 'Invalid runtime');

  const browserRunner = await getBrowser(platform);

  const playwrightOptions = {
    headless: options.headless,
    args: [...(options.headless ? [] : ['--auto-open-devtools-for-tabs']), ...(options.browserArgs ?? [])],
  };

  let context: BrowserContext;
  if (userDataDir) {
    await mkdir(userDataDir, { recursive: true });
    context = await browserRunner.launchPersistentContext(userDataDir, playwrightOptions);
  } else {
    const browser = await browserRunner.launch(playwrightOptions);
    context = await browser.newContext();
  }

  const page = await context.newPage();

  return {
    context,
    page,
  };
};

type BrowserOptions = {
  headless: boolean;
  browserArgs?: string[];
};

type WebResource = {
  contentType: string;
  data: string;
};

const servePage = async (resources: Record<string, WebResource>, port = 5176) => {
  const server = createServer((req, res) => {
    const fileName = req.url === '/' ? '/index.html' : req.url!;
    if (!resources[fileName]) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': resources[fileName].contentType });
    res.end(resources[fileName].data);
  });

  let retries = 0;
  server.on('error', (err) => {
    if (err.message.includes('EADDRINUSE') && retries < 100) {
      retries++;
      server.close();
      server.listen(port++, () => {
        trigger();
      });
    } else {
      throw err;
    }
  });

  let trigger: () => void;
  const serverReady = new Promise<void>((resolve) => {
    trigger = resolve;
  });

  server.listen(port++, () => {
    trigger();
  });
  await serverReady;
  return server;
};

type EposedApis = {
  dx_runner_done: (signal?: NodeJS.Signals | number) => void;
  dx_runner_log: LogProcessor;
};
