//
// Copyright 2026 DXOS.org
//

// Measures an app in the ECHO document mode it was built with: set `DX_ECHO_DOCUMENT_MODE` (and
// `DX_ECHO_PROXY_INDEX_READS`) for the build, and `MODE` to label the results.
// Usage: [APP=todomvc|tasks] [MODE=<label>] [CHROMIUM=<path>] node measure-echo.mjs <baseUrl> <count> <rounds>
import { chromium } from '@playwright/test';

const [base = 'http://127.0.0.1:9006/', countArg = '200', roundsArg = '3'] = process.argv.slice(2);
const count = Number(countArg);
const rounds = Number(roundsArg);
const mode = process.env.MODE ?? 'as built';

/** Where each app renders its list: TodoMVC walks refs from a list object, Tasks runs a query. */
const APPS = {
  todomvc: { ready: '[data-testid="list"]', item: '[data-testid="todo"]', toggle: '[data-testid="todo-toggle"]' },
  tasks: { ready: 'h1', item: 'li', toggle: 'input[type="checkbox"]' },
};
const app = APPS[process.env.APP ?? 'todomvc'];

// `CHROMIUM` overrides the browser Playwright would pick, for machines with another build installed.
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
/** What the script is doing, recorded with each error so an error can be traced to a phase. */
let phase = 'boot';
page.on('pageerror', (err) => errors.push(`[${phase}] page: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().includes('EdgeClient')) {
    errors.push(`[${phase}] console: ${msg.text().slice(0, 300)}`);
  }
});

// The page's CDP session auto-attaches to its workers; Playwright exposes no session for a worker.
const pageSession = await context.newCDPSession(page);
const workerSessions = new Map();
const replies = new Map();
let nextMessageId = 1;
pageSession.on('Target.attachedToTarget', ({ sessionId, targetInfo }) => workerSessions.set(sessionId, targetInfo));
pageSession.on('Target.detachedFromTarget', ({ sessionId }) => workerSessions.delete(sessionId));
pageSession.on('Target.receivedMessageFromTarget', ({ message }) => {
  const reply = JSON.parse(message);
  replies.get(reply.id)?.(reply);
});
await pageSession.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: false });

const sendToWorker = (sessionId, method, params = {}) =>
  new Promise((resolve) => {
    const id = nextMessageId++;
    replies.set(id, (reply) => {
      replies.delete(id);
      resolve(reply.result);
    });
    void pageSession.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) });
  });

const mb = (bytes) => (bytes === undefined ? null : +(bytes / 2 ** 20).toFixed(1));

/** JS heap and array-buffer backing store (which holds wasm memory) of the page and its ECHO worker, after a GC. */
const heaps = async () => {
  await pageSession.send('HeapProfiler.collectGarbage');
  const page = await pageSession.send('Runtime.getHeapUsage');
  const result = { 'page heap MB': mb(page.usedSize), 'page buffers MB': mb(page.backingStorageSize) };
  for (const [sessionId, targetInfo] of workerSessions) {
    if (targetInfo.url.includes('dedicated-worker')) {
      await sendToWorker(sessionId, 'HeapProfiler.collectGarbage');
      const worker = await sendToWorker(sessionId, 'Runtime.getHeapUsage');
      result['worker heap MB'] = mb(worker?.usedSize);
      result['worker buffers MB'] = mb(worker?.backingStorageSize);
    }
  }
  return result;
};

/** The dedicated worker that runs ECHO for this page. */
const echoWorker = async () => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const worker = page.workers().find((worker) => worker.url().includes('dedicated-worker'));
    if (worker) {
      return worker;
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`no dedicated worker among ${page.workers().map((worker) => worker.url())}`);
};

/** Documents the worker holds in memory, from the ECHO host's own diagnostic. */
const loadedDocs = async () => {
  const worker = await echoWorker();
  return worker.evaluate(async () => {
    const result = await globalThis.TRACE_PROCESSOR.diagnostics.fetch({ id: 'echo-stats' });
    return result.data?.loadedDocsCount ?? null;
  });
};

const shown = () => page.locator(app.item).count();

const waitForItems = (n, timeout = 300_000) =>
  page.waitForFunction(([selector, n]) => document.querySelectorAll(selector).length >= n, [app.item, n], { timeout });

const open = async (search = '') => {
  const started = Date.now();
  await page.goto(`${base}${search}`);
  await page.locator(app.ready).or(page.getByTestId('app-error')).first().waitFor({ timeout: 120_000 });
  if (await page.getByTestId('app-error').isVisible()) {
    throw new Error(`app error: ${await page.getByTestId('app-error').innerText()}`);
  }
  return started;
};

// Seed once, then give the worker time to index what it wrote.
phase = 'seed';
{
  const started = await open(`?seed=${count}`);
  await waitForItems(count);
  console.log(`seeded ${await shown()} items in ${Date.now() - started} ms`);
  await page.waitForTimeout(5_000);
}

const rows = [];
for (let round = 0; round < rounds; round++) {
  phase = `round ${round}`;
  const started = await open();
  await waitForItems(count);
  const elapsed = Date.now() - started;
  await page.waitForTimeout(1_500);
  rows.push({
    round,
    mode,
    'shown (ms)': elapsed,
    'items': await shown(),
    'worker docs': await loadedDocs(),
    ...(await heaps()),
  });
}
console.table(rows);

// With index reads, a write loads only the document written.
phase = 'write';
{
  await open();
  await waitForItems(count);
  await page.waitForTimeout(1_500);
  const before = await loadedDocs();
  const toggle = page.locator(app.item).nth(3).locator(app.toggle);
  await toggle.click();
  await page.waitForTimeout(2_000);
  const after = await loadedDocs();
  const checked = await toggle.isChecked();
  await open();
  await waitForItems(count);
  const persisted = await page.locator(app.item).nth(3).locator(app.toggle).isChecked();
  console.log({ write: { docsBefore: before, docsAfter: after, checked, persistedAfterReload: persisted } });
}

// Two tabs: the second proxies through the first tab's worker.
phase = 'two tabs';
{
  await open();
  await waitForItems(count);
  const second = await context.newPage();
  second.on('pageerror', (err) => errors.push(`second page: ${err.message}`));
  await second.goto(base);
  await second.waitForFunction(([selector, n]) => document.querySelectorAll(selector).length >= n, [app.item, count], {
    timeout: 120_000,
  });
  const toggle = page.locator(app.item).nth(5).locator(app.toggle);
  const wanted = !(await toggle.isChecked());
  const started = Date.now();
  await toggle.click();
  const mirrored = second.locator(app.item).nth(5).locator(app.toggle);
  let seen = false;
  while (Date.now() - started < 15_000) {
    if ((await mirrored.isChecked()) === wanted) {
      seen = true;
      break;
    }
    await second.waitForTimeout(20);
  }
  console.log({ twoTabs: { seenInSecondTab: seen, afterMs: Date.now() - started, workerDocs: await loadedDocs() } });
  await second.close();
}

console.log({ errors: errors.slice(0, 20), errorCount: errors.length });
await browser.close();
