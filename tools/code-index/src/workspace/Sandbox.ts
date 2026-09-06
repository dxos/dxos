//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';
import * as Events from './Events.ts';
import * as Log from './Log.ts';

/**
 * Runs one snippet in a Bun child process and answers the host calls it makes. The snippet is the
 * agent's only way to act, and this bridge is the snippet's only way to reach anything: it gets no
 * network client, no filesystem helper and no database handle, so the capability surface is
 * exactly the four namespaces in `sandbox/api.d.ts`.
 *
 * The isolation here is process-level — a fresh interpreter, a scrubbed environment, a temporary
 * working directory and a wall-clock deadline. It bounds accidents (a runaway loop, a snippet that
 * writes where it should not) rather than a hostile snippet, which nothing short of a container
 * would; the model authoring the code is the trust boundary.
 */

export class SandboxError extends Data.TaggedError('code-index/SandboxError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type Result = {
  readonly ok: boolean;
  /** Everything the snippet printed, plus its final value — the model's view of the run. */
  readonly output: string;
  /** What it published to the screen. Appended to the log by the caller, so a run is one commit. */
  readonly presented: readonly Events.Presented[];
};

export type RunOptions = {
  readonly projectId: string;
  readonly code: string;
  /** Wall-clock budget; a snippet still running when it expires is killed and reported as failed. */
  readonly timeoutMs?: number;
};

export interface Api {
  readonly run: (options: RunOptions) => Effect.Effect<Result, SandboxError>;
}

export class Sandbox extends Context.Service<Sandbox, Api>()('code-index/Sandbox') {}

export const DEFAULT_TIMEOUT_MS = 60_000;

const RUNTIME = fileURLToPath(new URL('./sandbox/runtime.ts', import.meta.url));

const MAX_OUTPUT = 32_000;

/**
 * The interpreter the snippet runs under. Bun, always — the runtime file is TypeScript and is
 * loaded directly. When the host is itself Bun that is its own binary; under Node (the test suite)
 * it is looked up here, because the child's environment is scrubbed and has no `PATH` to find it
 * with. `undefined` means there is no Bun on this machine, which is a diagnosable condition rather
 * than a spawn failure.
 */
export const interpreter = (): string | undefined => {
  if (typeof globalThis.Bun !== 'undefined') {
    return process.execPath;
  }
  const candidates = [
    ...(process.env.PATH ?? '')
      .split(delimiter)
      .filter(Boolean)
      .map((entry) => join(entry, 'bun')),
    join(homedir(), '.bun/bin/bun'),
  ];
  return candidates.find((candidate) => existsSync(candidate));
};

/** SPARQL rows are truncated hard: a query with no LIMIT must not be able to fill the context. */
const MAX_ROWS = 500;

const truncate = (text: string): string =>
  text.length <= MAX_OUTPUT ? text : `${text.slice(0, MAX_OUTPUT)}\n… output truncated (${text.length} chars)`;

/**
 * What the graph actually contains, rather than what the indexer asserts. The distinction matters:
 * the classes and relations an agent most wants — `EffectLayer`, `providesService` — are concluded
 * by the N3 rules and appear nowhere in the JSON-LD context. Reporting the context instead sent the
 * agent brute-forcing predicate names for four turns before it found `providesService` by hand.
 */
const VOCABULARY_QUERY = `PREFIX deus: <${Ontology.PREFIX}>
  SELECT ?kind ?term (COUNT(*) AS ?count) WHERE {
    { ?s a ?term . BIND('class' AS ?kind) }
    UNION
    { ?s ?term ?o . BIND('property' AS ?kind) }
    FILTER(STRSTARTS(STR(?term), '${Ontology.PREFIX}'))
  } GROUP BY ?kind ?term ORDER BY ?kind DESC(?count)`;

type HostCall = { readonly id: number; readonly method: string; readonly params: Record<string, unknown> };

const make = Effect.gen(function* () {
  const store = yield* Store.Store;
  const log = yield* Log.Log;

  // A whole-graph scan, so it is computed once and shared by every snippet in the process.
  const vocabulary = yield* Effect.cached(
    store.select(VOCABULARY_QUERY).pipe(
      Effect.map((rows) =>
        rows.map((row) => ({
          term: row.term.slice(Ontology.PREFIX.length),
          kind: row.kind,
          count: Number(row.count),
        })),
      ),
    ),
  );

  /** One host call. A failure here is the snippet's failure, not the run's: it sees the message. */
  const handle = (
    projectId: string,
    call: HostCall,
    presented: Events.Presented[],
  ): Effect.Effect<unknown, SandboxError> => {
    const params = call.params;
    switch (call.method) {
      case 'rdf.query':
        return store.select(String(params.sparql)).pipe(
          Effect.map((rows) => rows.slice(0, MAX_ROWS)),
          Effect.mapError((cause) => new SandboxError({ message: cause.message, cause })),
        );
      case 'rdf.ask':
        return store
          .ask(String(params.sparql))
          .pipe(Effect.mapError((cause) => new SandboxError({ message: cause.message, cause })));
      case 'rdf.prefixes':
        return Effect.succeed(Ontology.prefixes);
      case 'rdf.vocabulary':
        return vocabulary.pipe(Effect.mapError((cause) => new SandboxError({ message: cause.message, cause })));
      case 'storage.get':
        return log.getValue(projectId, String(params.key)).pipe(
          Effect.map((value) => (value === undefined ? undefined : JSON.parse(value))),
          Effect.mapError((cause) => new SandboxError({ message: cause.message, cause })),
        );
      case 'storage.set':
        return log
          .setValue(projectId, String(params.key), JSON.stringify(params.value ?? null))
          .pipe(Effect.mapError((cause) => new SandboxError({ message: cause.message, cause })));
      case 'storage.keys':
        return log
          .listKeys(projectId)
          .pipe(Effect.mapError((cause) => new SandboxError({ message: cause.message, cause })));
      case 'display':
        return Effect.sync(() => {
          presented.push(
            new Events.Presented({
              kind: Events.toKind(String(params.kind)),
              title: typeof params.title === 'string' ? params.title : undefined,
              content: String(params.content),
            }),
          );
        });
      case 'display.clear':
        return Effect.sync(() => {
          presented.length = 0;
        });
      default:
        return Effect.fail(new SandboxError({ message: `Unknown host call: ${call.method}` }));
    }
  };

  const run: Api['run'] = ({ projectId, code, timeoutMs = DEFAULT_TIMEOUT_MS }) =>
    Effect.gen(function* () {
      const presented: Events.Presented[] = [];
      const bun = interpreter();
      if (bun === undefined) {
        return yield* Effect.fail(
          new SandboxError({ message: 'The sandbox needs Bun on this machine; none was found on PATH.' }),
        );
      }

      const result = yield* Effect.callback<{ ok: boolean; output: string }, SandboxError>((resume) => {
        const child = spawn(bun, ['run', RUNTIME], {
          cwd: tmpdir(),
          // Nothing of the host's environment is inherited: no API keys, no proxy settings, no
          // `PATH` into the repository's tooling.
          env: { PATH: '/usr/bin:/bin', HOME: tmpdir(), NODE_ENV: 'production' },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let buffer = '';
        let settled = false;
        let stderr = '';

        const finish = (outcome: Effect.Effect<{ ok: boolean; output: string }, SandboxError>) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          child.kill('SIGKILL');
          resume(outcome);
        };

        const timer = setTimeout(
          () =>
            finish(
              Effect.succeed({
                ok: false,
                output: `Timed out after ${timeoutMs}ms. Narrow the query or split the work.`,
              }),
            ),
          timeoutMs,
        );

        const answer = (message: unknown) => {
          if (!child.stdin.destroyed) {
            child.stdin.write(`${JSON.stringify(message)}\n`);
          }
        };

        const onLine = (line: string) => {
          let message: HostCall | { done: true; ok: boolean; output: string };
          try {
            message = JSON.parse(line);
          } catch (cause) {
            finish(new SandboxError({ message: `Malformed message from sandbox: ${line}`, cause }).pipe(Effect.fail));
            return;
          }
          if ('done' in message) {
            finish(Effect.succeed({ ok: message.ok, output: message.output }));
            return;
          }
          // Host calls are answered on the parent's runtime; the snippet is blocked on its promise.
          void Effect.runPromiseExit(handle(projectId, message, presented)).then((exit) => {
            answer(
              exit._tag === 'Success'
                ? { id: message.id, result: exit.value }
                : { id: message.id, error: String(exit.cause) },
            );
          });
        };

        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk: string) => {
          buffer += chunk;
          let newline = buffer.indexOf('\n');
          while (newline >= 0) {
            const line = buffer.slice(0, newline);
            buffer = buffer.slice(newline + 1);
            if (line.length > 0) {
              onLine(line);
            }
            newline = buffer.indexOf('\n');
          }
        });
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk: string) => {
          stderr += chunk;
        });
        child.on('error', (cause) => finish(Effect.fail(new SandboxError({ message: 'Cannot start sandbox', cause }))));
        // A child that dies without reporting (a crash, an `Bun.exit`) is a failed run, not a
        // failed tool: the model is told what happened and can try again.
        child.on('close', (code) =>
          finish(Effect.succeed({ ok: false, output: stderr.trim() || `Sandbox exited with code ${code}` })),
        );

        // The snippet travels as the first line, JSON-encoded, so a newline in it is not framing.
        child.stdin.write(`${JSON.stringify(code)}\n`);

        return Effect.sync(() => {
          clearTimeout(timer);
          child.kill('SIGKILL');
        });
      });

      return { ok: result.ok, output: truncate(result.output), presented };
    });

  return { run } satisfies Api;
});

export const layer: Layer.Layer<Sandbox, never, Store.Store | Log.Log> = Layer.effect(Sandbox, make);
