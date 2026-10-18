//
// Copyright 2026 DXOS.org
//

// The toolchain seed on the embedded kernel, with IO answered from host.mjs's in-memory file
// system: the whole CLI runs with no Node API behind it, as it does in a browser page.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { createDeus, createFiles } from './host.mjs';

const crate = join(import.meta.dirname, '..');
const lang = join(crate, '../deus-lang');

test('the toolchain creates a codebase, adds a file and runs it from memory', async () => {
  const fs = createFiles({
    '/deus/deus/builtins.deus': readFileSync(join(lang, 'deus/builtins.deus'), 'utf8'),
    '/deus/deus/prelude.deus': readFileSync(join(lang, 'deus/prelude.deus'), 'utf8'),
    '/work/hello.deus': 'namespace Hello\n\ndef main (u : Unit) : {IO} Unit := IO.print "hello\\n"\n',
  });
  const deus = await createDeus({
    wasm: readFileSync(join(crate, 'target/wasm32-unknown-unknown/release/deus_kernel.wasm')),
    fs,
    env: { DEUS_HOME: '/deus', DEUS_CODEBASE: '/codebase' },
  });
  const image = readFileSync(join(lang, 'seed/deus.image'), 'utf8');
  const cli = (...args) => deus.run(image, { args, cwd: '/work' });

  assert.equal((await cli('init')).code, 0);
  assert.ok(fs.isDir('/codebase/objects'));
  assert.match((await cli('add', 'hello.deus')).stdout, /\+ Hello\.main/);
  assert.deepEqual(await cli('run', 'Hello.main'), {
    stdout: 'hello\n',
    stderr: '',
    code: 0,
    result: { state: 'done', value: null },
  });
  assert.equal((await cli('eval', '6 * 7')).stdout, '42\n');

  const missing = await cli('view', 'Nope.nothing');
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /Nope\.nothing/);
});

test('the in-memory file system lists, removes and resolves paths', () => {
  const fs = createFiles({ '/a/b.txt': 'b', '/a/c/d.txt': 'd' });
  assert.deepEqual(fs.list('/a'), ['b.txt', 'c']);
  assert.equal(fs.read('/a/c/../b.txt'), 'b');
  fs.remove('/a/c');
  assert.deepEqual(fs.list('/a'), ['b.txt']);
  assert.equal(fs.exists('/a/c'), false);
});
