//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { spawnSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

import { SpikeHost } from './host.ts';
import { canon, initialShape, unknownTo } from './testing.ts';

const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64');
const fromBase64 = (text: string): Uint8Array => Uint8Array.from(Buffer.from(text, 'base64'));

describe('a tab with no WebAssembly', () => {
  test('loads, applies, writes, encodes and saves in a process where WebAssembly does not exist', () => {
    const host = new SpikeHost();
    host.create('doc', initialShape());
    let peer = A.clone(host.doc('doc'), { actor: 'eeee0000eeee0000eeee0000eeee0000' });
    peer = A.change(peer, (doc) => {
      A.splice(doc, ['content'], 0, 0, 'Peer ');
      doc.tags.push(new A.ImmutableString('p'));
    });
    host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
    // The tab opens from saved bytes alone and computes the change hashes itself.
    const { bytes, heads } = host.subscribe('doc', 'child', () => {});
    // Then the worker delivers another peer change.
    peer = A.change(peer, (doc) => {
      doc.count = 7;
    });
    const delivered = unknownTo(host.doc('doc'), peer);
    host.applyRemote('doc', delivered);

    const child = spawnSync(
      process.execPath,
      [
        '--import',
        'data:text/javascript,delete globalThis.WebAssembly',
        '--conditions=source',
        '--import',
        'tsx',
        'src/tab-child.ts',
      ],
      {
        cwd: import.meta.dirname.replace(/\/src$/, ''),
        input: JSON.stringify({ saved: toBase64(bytes), changes: delivered.map(toBase64) }),
        encoding: 'utf8',
      },
    );
    expect(child.stderr).toBe('');
    expect(child.status).toBe(0);
    const output = JSON.parse(child.stdout);
    expect(output.webAssembly).toBe('undefined');
    expect(output.loadedHeads).toEqual(heads);

    // The worker's Automerge takes the tab's bytes and ends up with the tab's document and heads.
    const [doc] = A.applyChanges(host.doc('doc'), output.changes.map(fromBase64));
    expect(A.getHeads(doc)).toEqual(output.heads);
    expect(canon(A.toJS(doc))).toBe(canon(JSON.parse(output.doc)));
    expect(A.getCursorPosition(doc, ['content'], output.cursor)).toBe(3);
    // Patches crossed JSON on the way out of the child, so compare them the same way.
    expect(output.diff).toEqual(JSON.parse(JSON.stringify(A.diff(doc, A.getHeads(host.doc('doc')), output.heads))));
    expect(A.getHeads(A.load(fromBase64(output.saved)))).toEqual(output.heads);
  });
});
