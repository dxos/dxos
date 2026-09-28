//
// Copyright 2026 DXOS.org
//

// Measures how fast Composer's nav tree shows a space of N markdown documents in the ECHO document
// mode the app was built with: set `DX_ECHO_DOCUMENT_MODE` (and `DX_ECHO_PROXY_INDEX_READS`) for the
// build, and `MODE` to label the results.
// Usage: [MODE=<label>] [CHROMIUM=<path>] node measure-navtree.mjs <baseUrl> <count> <rounds> <profileDir>
import { chromium } from '@playwright/test';
import { rmSync } from 'node:fs';

const [base = 'http://127.0.0.1:4173/', countArg = '200', roundsArg = '3', profile = '/tmp/composer-navtree'] =
  process.argv.slice(2);
const count = Number(countArg);
const rounds = Number(roundsArg);
const mode = process.env.MODE ?? 'as built';
const BATCH = 25;

const errors = [];
let phase = 'seed';

/** A browser of its own per run on one profile directory, so each mode starts a fresh worker on the same data. */
const launch = async () => {
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    executablePath: process.env.CHROMIUM,
    viewport: { width: 1400, height: 900 },
  });
  const page = context.pages()[0] ?? (await context.newPage());
  page.on('pageerror', (err) => errors.push(`[${phase}] page: ${err.message.slice(0, 300)}`));
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('EdgeClient') && !text.includes('Failed to fetch')) {
      errors.push(`[${phase}] console: ${text.slice(0, 300)}`);
    }
  });
  // The tree prefetches a row's children after the pointer rests on it, which would skew a run.
  await page.mouse.move(1390, 890);
  return { context, page };
};

const rows = (page) => page.getByTestId('navtree.workspace.visible').getByTestId('spacePlugin.object');

const waitForRows = async (page, n, timeout = 600_000) => {
  const started = Date.now();
  let first;
  while (Date.now() - started < timeout) {
    const shown = await rows(page).count();
    if (shown > 0 && first === undefined) {
      first = Date.now();
    }
    if (shown >= n) {
      return { firstAt: first ?? Date.now(), allAt: Date.now() };
    }
    await page.waitForTimeout(25);
  }
  throw new Error(`nav tree showed ${await rows(page).count()} of ${n} rows`);
};

const waitForApp = async (page) => {
  await page.getByTestId('treeView.userAccount').waitFor({ timeout: 180_000 });
  await page.waitForFunction(() => typeof globalThis.composer?.invoke === 'function', undefined, { timeout: 180_000 });
};

/** The dedicated worker that runs ECHO for this page. */
const echoWorker = async (page) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    for (const worker of page.workers()) {
      const hasEcho = await worker
        .evaluate(() => globalThis.TRACE_PROCESSOR?.diagnostics?.registry?.has('echo-stats') ?? false)
        .catch(() => false);
      if (hasEcho) {
        return worker;
      }
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`no ECHO worker among ${page.workers().map((worker) => worker.url())}`);
};

/** Documents the worker holds in memory, from the ECHO host's own diagnostic; covers every space. */
const loadedDocs = async (page) =>
  (await echoWorker(page)).evaluate(async () => {
    const result = await globalThis.TRACE_PROCESSOR.diagnostics.fetch({ id: 'echo-stats' });
    return result.data?.loadedDocsCount ?? null;
  });

const mb = (bytes) => (bytes === undefined ? null : +(bytes / 2 ** 20).toFixed(1));

/** JS heap and array-buffer backing store (which holds wasm memory) of the page and its ECHO worker, after a GC. */
const heaps = async (context, page) => {
  const session = await context.newCDPSession(page);
  const workerSessions = new Map();
  const replies = new Map();
  let nextId = 1;
  session.on('Target.attachedToTarget', ({ sessionId, targetInfo }) => workerSessions.set(sessionId, targetInfo));
  session.on('Target.receivedMessageFromTarget', ({ message }) => {
    const reply = JSON.parse(message);
    replies.get(reply.id)?.(reply.result);
  });
  await session.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: false });
  const send = (sessionId, method, params = {}) =>
    new Promise((resolve) => {
      const id = nextId++;
      replies.set(id, resolve);
      void session.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) });
    });
  await page.waitForTimeout(500);
  await session.send('HeapProfiler.collectGarbage');
  const tab = await session.send('Runtime.getHeapUsage');
  const result = { 'tab heap MB': mb(tab.usedSize), 'tab buffers MB': mb(tab.backingStorageSize) };
  for (const [sessionId, targetInfo] of workerSessions) {
    if (targetInfo.type === 'worker' && targetInfo.title?.includes('dxos-client-worker')) {
      await send(sessionId, 'HeapProfiler.collectGarbage');
      const worker = await send(sessionId, 'Runtime.getHeapUsage');
      result['worker heap MB'] = mb(worker?.usedSize);
      result['worker buffers MB'] = mb(worker?.backingStorageSize);
    }
  }
  return result;
};

// Seed: a space of `count` markdown documents, created through the app's own operations so they are
// filed into the root collection the nav tree lists, with its Collections branch left open.
rmSync(profile, { recursive: true, force: true });
let spaceId;
{
  const { context, page } = await launch();
  await page.goto(base);
  await waitForApp(page);
  const started = Date.now();
  // The ids are read in the page: an operation's output carries the space object, which holds BigInts
  // `page.evaluate` cannot return.
  spaceId = await page.evaluate(
    async ({ count, batch }) => {
      const invoke = (key, input, spaceId) => globalThis.composer.invoke(key, input, spaceId ? { spaceId } : undefined);
      const created = await invoke('org.dxos.operation.space.create', { name: `Nav tree ${count}` });
      const id = (created?.space ?? created)?.id;
      for (let start = 0; start < count; start += batch) {
        await Promise.all(
          Array.from({ length: Math.min(batch, count - start) }, (_, index) =>
            invoke(
              'org.dxos.operation.markdown.create',
              { name: `Document ${start + index}`, content: `Body of document ${start + index}.` },
              id,
            ).then(() => undefined),
          ),
        );
      }
      return id;
    },
    { count, batch: BATCH },
  );
  // A new identity's first run navigates to its default space, so open the seeded one directly.
  await page.goto(`${base}w/${spaceId}/home`);
  await waitForApp(page);
  await page.evaluate(
    (id) =>
      globalThis.composer.invoke('org.dxos.operation.appToolkit.expose', { subject: `root/${id}/content/collections` }),
    spaceId,
  );
  await waitForRows(page, count);
  console.log(`seeded ${count} documents in space ${spaceId} in ${Date.now() - started} ms`);
  // Time for the worker to index what it wrote before the profile is reused.
  await page.waitForTimeout(15_000);
  await context.close();
}

const results = [];
for (let round = 0; round < rounds; round++) {
  phase = `round ${round}`;
  const { context, page } = await launch();
  const started = Date.now();
  await page.goto(`${base}w/${spaceId}/home`);
  const { firstAt, allAt } = await waitForRows(page, count);
  await page.waitForTimeout(2_000);
  results.push({
    round,
    mode,
    'first row (ms)': firstAt - started,
    'all rows (ms)': allAt - started,
    'rows': await rows(page).count(),
    'worker docs': await loadedDocs(page),
    ...(await heaps(context, page)),
  });
  await context.close();
}
console.table(results);
console.log({ errors: errors.slice(0, 25), errorCount: errors.length });
