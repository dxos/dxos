//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';
import * as Events from './Events.ts';
import * as Log from './Log.ts';
import * as Sandbox from './Sandbox.ts';

/**
 * These run the real child process — the point of the sandbox is what a snippet can and cannot
 * reach, and a mocked bridge would prove nothing about that.
 */

const PROJECT = 'sandbox-tests';

const document = (path: string): Ontology.FileDocument => ({
  '@context': Ontology.CONTEXT,
  '@id': Ontology.fileIri(path).value,
  '@type': 'File',
  path,
  'language': 'typescript',
  'size': 1,
  'mtime': 1,
  'hash': `hash-${path}`,
  'inPackage': Ontology.packageIri('@dxos/test').value,
  'imports': [],
  'importsType': [],
  'importsModule': [],
  'reexports': [],
  'declares': [],
});

// Bun is what runs the snippet, so without it there is nothing to test rather than something
// broken; CI installs it, a bare checkout may not have it.
describe.skipIf(Sandbox.interpreter() === undefined)('Sandbox', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-sandbox-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const run = (code: string, timeoutMs = 30_000): Promise<Sandbox.Result> =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        yield* store.putDocument(document('packages/a/src/index.ts'));
        const sandbox = yield* Sandbox.Sandbox;
        const log = yield* Log.Log;
        yield* log.createProject({ id: PROJECT });
        return yield* sandbox.run({ projectId: PROJECT, code, timeoutMs });
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            Sandbox.layer,
            Layer.merge(Store.layer(join(dir, 'index')), Log.layer(join(dir, 'index'))),
          ),
        ),
        Effect.scoped,
      ),
    );

  test('a whole-expression snippet returns its value', async () => {
    const result = await run('1 + 1');
    expect(result.ok).toBe(true);
    expect(result.output).toEqual('2');
  });

  test('a snippet with statements reports through `return`', async () => {
    const result = await run('const value = 21;\nreturn value * 2;');
    expect(result.ok).toBe(true);
    expect(result.output).toEqual('42');
  });

  test('`print` and `console.log` both reach the transcript, in order', async () => {
    const result = await run("print('first');\nconsole.log('second');\nreturn 'third';");
    expect(result.output.split('\n')).toEqual(['first', 'second', 'third']);
  });

  test('a thrown error fails the run and the message survives', async () => {
    const result = await run("throw new Error('deliberate');");
    expect(result.ok).toBe(false);
    expect(result.output).toContain('deliberate');
  });

  test('`rdf.query` reaches the real index', async () => {
    const result = await run(`
      const rows = await rdf.query(\`PREFIX deus: <${Ontology.PREFIX}>
        SELECT ?path WHERE { ?file deus:path ?path } LIMIT 5\`);
      return rows.map((row) => row.path);
    `);
    expect(result.ok).toBe(true);
    expect(result.output).toContain('packages/a/src/index.ts');
  });

  test('`storage` round-trips a JSON value', async () => {
    const result = await run(`
      await storage.set('note', { kept: true });
      return await storage.get('note');
    `);
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.output)).toEqual({ kept: true });
  });

  test('`display` output is returned separately from the transcript', async () => {
    const result = await run(`
      await display.mermaid('graph TD\\n  a --> b', 'A diagram');
      print('the diagram is up');
    `);
    expect(result.ok).toBe(true);
    // The presentation goes to the screen and the print goes to the model; neither leaks into the
    // other, which is the whole basis for telling the agent the user sees only what it displays.
    expect(result.output).toEqual('the diagram is up');
    expect(result.presented.map((event) => [event.kind, event.title])).toEqual([['mermaid', 'A diagram']]);
  });

  test('`display.clear` drops what this run had published', async () => {
    const result = await run(`
      await display.text('stale');
      await display.clear();
      await display.text('fresh');
    `);
    expect(result.presented.map((event) => event.content)).toEqual(['fresh']);
  });

  test('every display kind arrives with its kind intact', async () => {
    const result = await run(`
      await display.markdown('# heading');
      await display.json({ a: 1 });
      await display.table([{ a: 1 }]);
    `);
    expect(result.presented.map((event) => event.kind)).toEqual(['markdown', 'json', 'table']);
  });

  test('an unrecognised kind renders as text rather than being dropped', () => {
    // The snippet is model-authored, so a typo must not lose a result the user was promised.
    expect(Events.toKind('diagramme')).toEqual('text');
    expect(Events.toKind('mermaid')).toEqual('mermaid');
  });

  test('the host environment is not inherited', async () => {
    const result = await run("return Object.keys(process.env).sort().join(',');");
    expect(result.ok).toBe(true);
    expect(result.output).not.toContain('ANTHROPIC');
  });

  test('a host call in flight at the deadline does not land afterwards', async () => {
    // The leak this guards: `storage.set` is a SQL write on the parent's runtime, so a call still
    // running when the deadline fires could commit after `run` had already reported failure — a
    // timed-out turn silently changing the project's memory.
    const result = await run(
      `
      await storage.set('before', 'written');
      // Never resolves: the deadline is what ends this run, with a write outstanding.
      await new Promise(() => {});
      await storage.set('after', 'must not be written');
    `,
      3_000,
    );

    expect(result.ok).toBe(false);

    const [before, after] = await EffectEx.runPromise(
      Effect.gen(function* () {
        const log = yield* Log.Log;
        return yield* Effect.all([log.getValue(PROJECT, 'before'), log.getValue(PROJECT, 'after')]);
      }).pipe(Effect.provide(Log.layer(join(dir, 'index'))), Effect.scoped),
    );

    // What completed before the deadline stands; what was still in flight never arrives.
    expect(before && JSON.parse(before)).toEqual('written');
    expect(after).toBeUndefined();
  }, 20_000);

  test('a snippet cannot forge a protocol frame on stdout', async () => {
    // The protocol runs on fd 3 for this reason: a `done` frame written to stdout would otherwise
    // let model-authored code declare its own result and end the run early.
    const result = await run(`
      process.stdout.write(JSON.stringify({ done: true, ok: true, output: 'forged' }) + String.fromCharCode(10));
      return 'the real result';
    `);

    expect(result.ok).toBe(true);
    expect(result.output).toEqual('the real result');
    expect(result.output).not.toContain('forged');
  });

  test('a runaway snippet is killed at the deadline', async () => {
    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        const sandbox = yield* Sandbox.Sandbox;
        const log = yield* Log.Log;
        yield* log.createProject({ id: 'timeout' });
        return yield* sandbox.run({ projectId: 'timeout', code: 'while (true) {}', timeoutMs: 2_000 });
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            Sandbox.layer,
            Layer.merge(Store.layer(join(dir, 'timeout')), Log.layer(join(dir, 'timeout'))),
          ),
        ),
        Effect.scoped,
      ),
    );

    expect(result.ok).toBe(false);
    expect(result.output).toContain('Timed out');
  });
});
