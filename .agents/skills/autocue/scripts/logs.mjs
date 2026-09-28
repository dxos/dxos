//
// Copyright 2026 DXOS.org
//

import { createWriteStream } from 'node:fs';

/**
 * Prefix on the console line a tapped realm emits for each log entry. The control character keeps it
 * from colliding with anything the app prints itself.
 */
const MARK = '\u0001dxlog ';

/**
 * Runs inside the page and each dedicated worker. A bundled app has no `vite-plugin-log` runtime, so this
 * adds a processor to the realm's `@dxos/log` (published as `globalThis.DX_LOG`) that re-emits every entry
 * as one `app.log`-shaped NDJSON record on `console.debug`, which the driver collects. When the logger does
 * not exist yet, a setter on `DX_LOG` attaches the processor the moment the bundle creates it, so the
 * entries logged during boot are captured too. Must stay self-contained: it is serialized into the realm.
 */
const tapRealm = ({ mark, env }) => {
  const short = { 5: 'T', 10: 'D', 11: 'V', 12: 'I', 13: 'W', 14: 'E' };
  const attach = (log) => {
    if (!log?.addProcessor || log.__demoTap) {
      return;
    }
    log.__demoTap = true;
    log.addProcessor((_config, entry) => {
      // TRACE is excluded, as it is from `app.log`.
      if (entry.level <= 5) {
        return;
      }
      try {
        const meta = entry.computedMeta ?? {};
        const record = {
          t: new Date(entry.timestamp).toISOString(),
          l: short[entry.level] ?? '?',
          m: entry.message ?? '',
        };
        if (meta.filename !== undefined) {
          record.f = meta.filename;
        }
        if (meta.line !== undefined) {
          record.n = meta.line;
        }
        if (meta.context !== undefined) {
          record.o = meta.context;
        }
        if (entry.computedError !== undefined) {
          record.e = entry.computedError;
        }
        record.i = env;
        const context = entry.computedContext;
        if (context && Object.keys(context).length > 0) {
          record.c = JSON.stringify(context);
        }
        console.debug(mark + JSON.stringify(record));
      } catch {
        // A record that cannot be serialized is dropped rather than breaking the app's logging.
      }
    });
  };
  if (globalThis.DX_LOG) {
    attach(globalThis.DX_LOG);
    return;
  }
  let value;
  Object.defineProperty(globalThis, 'DX_LOG', {
    configurable: true,
    get: () => value,
    set: (next) => {
      value = next;
      attach(next);
    },
  });
};

/**
 * Streams the app's `@dxos/log` output from the page and its dedicated workers to an NDJSON file in the
 * same shape as Composer's `app.log`, so `scripts/query-logs.mjs` reads it. HTTP responses with an error
 * status are written alongside as `W` records under `driver/http`, since a failed fetch is often the only
 * trace a broken request leaves. SharedWorkers are out of reach: Playwright does not expose them.
 */
export const startLogTap = async ({ context, page, file }) => {
  const out = createWriteStream(file, { flags: 'w' });
  const write = (record) => out.write(`${JSON.stringify(record)}\n`);

  const collect = (message) => {
    const text = message.text();
    if (text.startsWith(MARK)) {
      out.write(`${text.slice(MARK.length)}\n`);
    }
  };

  await context.addInitScript(tapRealm, { mark: MARK, env: 'page' });
  // Chromium reports a dedicated worker's console on the page as well, so one listener covers both.
  page.on('console', collect);
  page.on('worker', (worker) => {
    const env = `worker:${worker.url().split('/').pop()?.split('?')[0] ?? 'unknown'}`;
    worker.evaluate(tapRealm, { mark: MARK, env }).catch(() => {});
  });

  context.on('response', async (response) => {
    if (response.status() < 400) {
      return;
    }
    // The body usually says why (an expired token, a missing entitlement); the start of it is enough.
    const body = await response.text().then(
      (text) => text.slice(0, 500),
      () => undefined,
    );
    write({
      t: new Date().toISOString(),
      l: 'W',
      m: 'http error response',
      f: 'driver/http',
      i: 'driver',
      c: JSON.stringify({ status: response.status(), method: response.request().method(), url: response.url(), body }),
    });
  });

  return { close: () => new Promise((resolve) => out.end(resolve)) };
};
