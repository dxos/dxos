//
// Copyright 2026 DXOS.org
//

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, test } from 'vitest';

import { Shell } from '#shell';

import { type Host, startHost } from './testing';

/**
 * Exercises the prebaked editor the way the tool does: over the wire, through the one route the host
 * exposes. There is no in-process path to test instead — the editor exists as a materialized script
 * precisely because "run a script" is the only verb the harness has.
 */
describe('apply edits', () => {
  let root: string;
  let host: Host;

  beforeAll(async () => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dx-computer-edits-')));
    host = await startHost({ root });
  });

  afterAll(async () => {
    await host.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  afterEach(() => {
    for (const entry of fs.readdirSync(root)) {
      fs.rmSync(path.join(root, entry), { recursive: true, force: true });
    }
  });

  const write = (file: string, content: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  };

  const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

  const apply = (edits: readonly Shell.Edit[], cwd?: string) => Shell.applyEdits(edits, { path: host.path, cwd });

  test('applies a single edit', async ({ expect }) => {
    write('a.ts', 'const value = 1;\n');

    const result = await apply([{ path: 'a.ts', oldString: 'const value = 1;', newString: 'const value = 2;' }]);
    expect(result.applied).to.be.true;
    expect(result.files).to.deep.eq([{ path: 'a.ts', replacements: 1 }]);
    expect(read('a.ts')).to.eq('const value = 2;\n');
  });

  test('applies edits across several files', async ({ expect }) => {
    write('a.ts', 'alpha\n');
    write('nested/b.ts', 'beta\n');

    const result = await apply([
      { path: 'a.ts', oldString: 'alpha', newString: 'ALPHA' },
      { path: 'nested/b.ts', oldString: 'beta', newString: 'BETA' },
    ]);
    expect(result.applied).to.be.true;
    expect(result.files).to.have.length(2);
    expect(read('a.ts')).to.eq('ALPHA\n');
    expect(read('nested/b.ts')).to.eq('BETA\n');
  });

  test('applies successive edits to one file in order', async ({ expect }) => {
    write('a.ts', 'one two\n');

    const result = await apply([
      { path: 'a.ts', oldString: 'one', newString: 'three' },
      { path: 'a.ts', oldString: 'three two', newString: 'done' },
    ]);
    expect(result.applied).to.be.true;
    expect(result.files).to.deep.eq([{ path: 'a.ts', replacements: 2 }]);
    expect(read('a.ts')).to.eq('done\n');
  });

  test('requires a unique match', async ({ expect }) => {
    write('a.ts', 'x\nx\n');

    const result = await apply([{ path: 'a.ts', oldString: 'x', newString: 'y' }]);
    expect(result.applied).to.be.false;
    expect(result.error).to.match(/matched 2 times/);
    expect(read('a.ts')).to.eq('x\nx\n');
  });

  test('replaces every occurrence with replaceAll', async ({ expect }) => {
    write('a.ts', 'x\nx\nx\n');

    const result = await apply([{ path: 'a.ts', oldString: 'x', newString: 'y', replaceAll: true }]);
    expect(result.applied).to.be.true;
    expect(result.files).to.deep.eq([{ path: 'a.ts', replacements: 3 }]);
    expect(read('a.ts')).to.eq('y\ny\ny\n');
  });

  test('writes nothing when any edit in the batch fails', async ({ expect }) => {
    write('a.ts', 'alpha\n');
    write('b.ts', 'beta\n');

    const result = await apply([
      { path: 'a.ts', oldString: 'alpha', newString: 'ALPHA' },
      { path: 'b.ts', oldString: 'gamma', newString: 'GAMMA' },
    ]);
    expect(result.applied).to.be.false;
    expect(result.error).to.match(/edit 2 \(b\.ts\): oldString not found/);
    expect(read('a.ts')).to.eq('alpha\n');
    expect(read('b.ts')).to.eq('beta\n');
  });

  test('treats replacement text literally', async ({ expect }) => {
    // `$&` and `$1` are pattern references to String.replace, so a naive implementation would
    // silently rewrite code that happens to contain them.
    write('a.ts', 'const price = 0;\n');

    const result = await apply([{ path: 'a.ts', oldString: 'price = 0', newString: "price = '$& $1 $`'" }]);
    expect(result.applied).to.be.true;
    expect(read('a.ts')).to.eq("const price = '$& $1 $`';\n");
  });

  test('reports a missing file rather than creating one', async ({ expect }) => {
    const result = await apply([{ path: 'ghost.ts', oldString: 'a', newString: 'b' }]);
    expect(result.applied).to.be.false;
    expect(result.error).to.match(/cannot read file/);
    expect(fs.existsSync(path.join(root, 'ghost.ts'))).to.be.false;
  });

  test('refuses a path outside the root', async ({ expect }) => {
    const result = await apply([{ path: '../escape.ts', oldString: 'a', newString: 'b' }]);
    expect(result.applied).to.be.false;
    expect(result.error).to.match(/outside the configured root/);
  });

  test('refuses an empty oldString', async ({ expect }) => {
    write('a.ts', 'alpha\n');

    const result = await apply([{ path: 'a.ts', oldString: '', newString: 'x' }]);
    expect(result.applied).to.be.false;
    expect(result.error).to.match(/non-empty string/);
  });

  test('resolves paths against a requested subdirectory', async ({ expect }) => {
    write('nested/a.ts', 'alpha\n');

    const result = await apply([{ path: 'a.ts', oldString: 'alpha', newString: 'ALPHA' }], 'nested');
    expect(result.applied).to.be.true;
    expect(read('nested/a.ts')).to.eq('ALPHA\n');
  });
});
