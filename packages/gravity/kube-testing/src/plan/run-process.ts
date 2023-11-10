//
// Copyright 2023 DXOS.org

import { fork } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { join } from 'node:path';
import type { BrowserType } from 'playwright';
import { v4 } from 'uuid';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type AgentResult, type AgentParams, type PlanOptions, type Platform, AGENT_LOG_FILE } from './spec';

const DEBUG_PORT_START = 9229;

type ProcessHandle = {
  /**
   * Promise that resolves when the agent finishes.
   */
  result: Promise<AgentResult>;

  /**
   * Kill the agent process/browser.
   */
  kill: () => void;
};

export const runNode = async <S, C>(
  planName: string,
  agentParams: AgentParams<S, C>,
  options: PlanOptions,
): Promise<ProcessHandle> => {
  const execArgv = process.execArgv;

  if (options.profile) {
    execArgv.push(
      '--cpu-prof', //
      '--cpu-prof-dir',
      agentParams.outDir,
      '--cpu-prof-name',
      'agent.cpuprofile',
    );
  }

  const childProcess = fork(process.argv[1], {
    execArgv: options.debug
      ? [
          '--inspect=:' + (DEBUG_PORT_START + agentParams.agentIdx), //
          ...execArgv,
        ]
      : execArgv,
    env: {
      ...process.env,
      GRAVITY_AGENT_PARAMS: JSON.stringify(agentParams),
      GRAVITY_SPEC: planName,
    },
  });

  return {
    result: new Promise<AgentResult>((resolve, reject) => {
      childProcess.on('error', (err) => {
        log.info('child process error', { err });
        reject(err);
      });
      childProcess.on('exit', async (exitCode, signal) => {
        if (exitCode == null) {
          log.warn('agent exited with signal', { signal });
          reject(new Error(`agent exited with signal ${signal}`));
          return;
        }

        if (exitCode !== 0) {
          log.warn('agent exited with non-zero exit code', { exitCode });
          reject(new Error(`agent exited with non-zero exit code ${exitCode}`));
          return;
        }

        resolve({
          result: exitCode ?? -1,
          outDir: agentParams.outDir,
          logFile: join(agentParams.outDir, AGENT_LOG_FILE),
        });
      });
      // TODO(nf): add timeout for agent completion
    }),
    kill: () => {
      childProcess.kill();
    },
  };
};

export const runBrowser = async <S, C>(
  agentParams: AgentParams<S, C>,
  options: PlanOptions,
): Promise<ProcessHandle> => {
  invariant(agentParams.runtime.platform);
  const { page } = await getNewBrowserContext(agentParams.runtime.platform, { headless: false });
  const doneTrigger = new Trigger<number>();

  const apis: EposedApis = {
    dxgravity_done: (code) => {
      doneTrigger.wake(code);
    },
  };
  for (const [name, fn] of Object.entries(apis)) {
    await page.exposeFunction(name, fn);
  }

  const server = await servePage({
    '/index.html': {
      contentType: 'text/html',
      data: `
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
      window.dxgravity_env = ${JSON.stringify({
        ...process.env,
        GRAVITY_AGENT_PARAMS: JSON.stringify(agentParams),
      })}
    </script>
    <script src="index.js"></script>
  </body>
  </html>
  `,
    },
    '/index.js': {
      contentType: 'text/javascript',
      data: await readFile(join(agentParams.planRunDir, 'browser.js'), 'utf8'),
    },
  });

  const port = (server.address() as AddressInfo).port;
  await page.goto(`http://localhost:${port}`);

  return {
    // TODO(mykola): Result should be a promise that resolves when the agent finishes.
    result: (async () => ({
      result: 0,
      outDir: agentParams.outDir,
      logFile: join(agentParams.outDir, AGENT_LOG_FILE),
    }))(),
    kill: () => page.close(),
  };
};

const getBrowser = (browserType: Platform): BrowserType => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { chromium, firefox, webkit } = require('playwright');
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

const getNewBrowserContext = async (browserType: Platform, options: BrowserOptions) => {
  const userDataDir = `/tmp/browser-mocha/${v4()}`;
  await mkdir(userDataDir, { recursive: true });

  const browserRunner = getBrowser(browserType);
  const context = await browserRunner.launchPersistentContext(userDataDir, {
    headless: options.headless,
    args: [...(options.headless ? [] : ['--auto-open-devtools-for-tabs']), ...(options.browserArgs ?? [])],
  });
  const page = await context.newPage();

  return {
    browserType,
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
  dxgravity_done: (code: number) => void;
};
