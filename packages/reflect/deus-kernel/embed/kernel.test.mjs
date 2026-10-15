//
// Copyright 2026 DXOS.org
//

// The embedded kernel suspends on each operation the program leaves unhandled and resumes with
// the embedder's (asynchronous) answer: here a key-value ability and IO.print.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createKernel, run } from './kernel.mjs';

const crate = join(import.meta.dirname, '..');
const lang = join(crate, '../deus-lang');

test('an embedded program awaits its host for every unhandled operation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'deus-embed-'));
  writeFileSync(
    join(dir, 'kv.deus'),
    [
      'ability Kv @"urn:deus:test:Kv" where',
      '  get : Text -> Option Text',
      '  put : Text -> Text -> Unit',
      '',
      'def main (u : Unit) : {Kv, IO} Text :=',
      '  Kv.put "greeting" "hello"',
      '  IO.print "stored\\n"',
      '  match Kv.get "greeting" with',
      '  | some value => value ++ " world"',
      '  | none => "missing"',
      '',
    ].join('\n'),
  );
  const image = join(dir, 'kv.image');
  execFileSync('node', [
    join(lang, 'bin/deus.mjs'),
    'compile',
    join(lang, 'deus/builtins.deus'),
    join(lang, 'deus/prelude.deus'),
    join(dir, 'kv.deus'),
    '--main',
    'main',
    '-o',
    image,
  ]);

  const kernel = await createKernel(
    readFileSync(join(crate, 'target/wasm32-unknown-unknown/release/deus_kernel.wasm')),
  );
  const store = new Map();
  const printed = [];
  const requests = [];
  const result = await run(kernel, readFileSync(image, 'utf8'), {
    handle: async (ability, op, args) => {
      requests.push(`${ability}/${op}`);
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (ability === 'urn:deus:test:Kv' && op === 1) {
        store.set(args[0], args[1]);
        return null;
      }
      if (ability === 'urn:deus:test:Kv' && op === 0) {
        return store.has(args[0])
          ? { $: 'urn:deus:builtin:Option', tag: 1, fields: [store.get(args[0])] }
          : { $: 'urn:deus:builtin:Option', tag: 0, fields: [] };
      }
      if (ability === 'urn:deus:builtin:IO' && op === 0) {
        printed.push(args[0]);
        return null;
      }
      throw new Error(`unexpected ${ability}/${op}`);
    },
  });
  assert.deepEqual(result, { state: 'done', value: 'hello world' });
  assert.deepEqual(requests, ['urn:deus:test:Kv/1', 'urn:deus:builtin:IO/0', 'urn:deus:test:Kv/0']);
  assert.deepEqual(printed, ['stored\n']);
});

test('a defect comes back with its message and trace', async () => {
  const kernel = await createKernel(
    readFileSync(join(crate, 'target/wasm32-unknown-unknown/release/deus_kernel.wasm')),
  );
  const result = kernel.start('(def "main" (lam (app (prim "Int.div") (int 1) (int 0)))) (main "main")');
  assert.deepEqual(result, { state: 'defect', message: 'division by zero', trace: ['main'] });
});

test('a second start on the same image reuses its code but not its state', async () => {
  const kernel = await createKernel(
    readFileSync(join(crate, 'target/wasm32-unknown-unknown/release/deus_kernel.wasm')),
  );
  const counter = [
    '(def "counter" (app (prim "Ref.new") (int 0)))',
    '(def "main" (lam (seq (app (prim "Ref.set") (ref "counter") (app (prim "Int.add") (app (prim "Ref.get") (ref "counter")) (int 1))) (app (prim "Ref.get") (ref "counter")))))',
    '(main "main")',
  ].join('\n');
  assert.deepEqual(kernel.start(counter), { state: 'done', value: 1 });
  assert.deepEqual(kernel.start(counter), { state: 'done', value: 1 });
  assert.deepEqual(kernel.start('(def "main" (lam (int 7))) (main "main")'), { state: 'done', value: 7 });
  assert.deepEqual(kernel.start(counter, 'main'), { state: 'done', value: 1 });
});
