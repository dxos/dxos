//
// Copyright 2026 DXOS.org
//
// The sandbox child process. Runs one snippet and exits; every capability it has is a call back to
// the host, and `node:fs` for the one write below is the only thing it imports. Started by
// `Sandbox.ts`, which passes the snippet on stdin as the first line.
//
// The protocol does not run over stdout. A snippet is model-authored code with `process` in scope,
// so anything it can write to, it can forge frames on: a `{"done":true,...}` line on stdout would
// end the run with a result of the snippet's choosing. The parent therefore opens a fourth pipe
// (fd 3) for the protocol and hands stdout to the snippet.
//
// The descriptor alone does not authenticate anything — a snippet can `import('node:fs')` and write
// to fd 3 itself — so every frame carries the token below and the parent drops frames without it.
//

import { writeSync } from 'node:fs';

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

const pending = new Map<number, Pending>();
const captured: string[] = [];
let nextId = 1;

// fd 3 is the protocol channel; the parent creates it with `stdio: [..., 'pipe']`.
const PROTOCOL_FD = 3;

// Read once and deleted, before the snippet exists: the evaluated code shares this process, so the
// token stays out of `process.env` and lives only in this module's scope, which an `AsyncFunction`
// body cannot reach.
const TOKEN = process.env.CODE_INDEX_TOKEN ?? '';
delete process.env.CODE_INDEX_TOKEN;

const write = (message: object): void => {
  writeSync(PROTOCOL_FD, `${JSON.stringify({ ...message, token: TOKEN })}\n`);
};

/** One host call. The host answers in order, but ids are matched anyway so it need not. */
const call = (method: string, params: unknown): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    write({ id, method, params });
  });

const format = (value: unknown): string =>
  typeof value === 'string' ? value : value instanceof Error ? (value.stack ?? value.message) : safeStringify(value);

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};

const print = (...values: unknown[]): void => {
  captured.push(values.map(format).join(' '));
};

// The snippet's own logging belongs in the transcript the model reads, so every console method
// funnels into the same capture `print` writes to rather than reaching a stream.
for (const level of ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const) {
  (console as unknown as Record<string, unknown>)[level] = print;
}

const rdf = {
  query: (sparql: string) => call('rdf.query', { sparql }),
  ask: (sparql: string) => call('rdf.ask', { sparql }),
  prefixes: () => call('rdf.prefixes', {}),
  vocabulary: () => call('rdf.vocabulary', {}),
};

const storage = {
  get: (key: string) => call('storage.get', { key }),
  set: (key: string, value: unknown) => call('storage.set', { key, value }),
  keys: () => call('storage.keys', {}),
};

const present = (kind: string, content: string, title?: string) => call('display', { kind, content, title });

const display = {
  markdown: (content: string, title?: string) => present('markdown', content, title),
  mermaid: (source: string, title?: string) => present('mermaid', source, title),
  table: (rows: readonly Record<string, unknown>[], title?: string) =>
    present('table', safeStringify(rows), title) as Promise<void>,
  json: (value: unknown, title?: string) => present('json', safeStringify(value), title),
  text: (content: string, title?: string) => present('text', content, title),
  clear: () => call('display.clear', {}),
};

const dispatch = (line: string): void => {
  const message = JSON.parse(line) as { id: number; result?: unknown; error?: string };
  const waiting = pending.get(message.id);
  if (!waiting) {
    return;
  }
  pending.delete(message.id);
  if (message.error !== undefined) {
    waiting.reject(new Error(message.error));
  } else {
    waiting.resolve(message.result);
  }
};

/**
 * The snippet, evaluated as an async function so top-level `await` works. `AsyncFunction` rather
 * than `eval` keeps the host's own locals — the protocol state above — out of the snippet's scope
 * chain.
 *
 * A snippet that is one whole expression is compiled as `return (…)` so its value is the result;
 * anything with statements in it is a function body, where `return` and `print` are the two ways
 * to report something. Which form applies is decided by whether the expression form parses, so a
 * snippet never has to declare its own shape.
 */
const evaluate = async (code: string): Promise<unknown> => {
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
    ...args: string[]
  ) => (...values: unknown[]) => Promise<unknown>;
  const compile = (body: string) => new AsyncFunction('rdf', 'storage', 'display', 'print', body);
  let body: (...values: unknown[]) => Promise<unknown>;
  try {
    body = compile(`return (\n${code}\n);`);
  } catch {
    body = compile(code);
  }
  return body(rdf, storage, display, print);
};

const main = async (): Promise<void> => {
  let buffer = '';
  let code: string | undefined;
  // The snippet and the answers to its host calls both arrive on stdin, in that order.
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (line.length > 0) {
        // The first line is the snippet; every later line answers a host call.
        if (code === undefined) {
          code = JSON.parse(line) as string;
          void finish(code);
        } else {
          dispatch(line);
        }
      }
      newline = buffer.indexOf('\n');
    }
  });
};

const finish = async (code: string): Promise<void> => {
  try {
    const value = await evaluate(code);
    if (value !== undefined) {
      captured.push(format(value));
    }
    write({ done: true, ok: true, output: captured.join('\n') });
  } catch (error) {
    captured.push(format(error));
    write({ done: true, ok: false, output: captured.join('\n') });
  }
  // The host closes the pipe once it has the result; exiting first would race that read.
  process.stdin.pause();
};

void main();
