//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { resolveBlockSchemas } from './dialects.ts';
import { blockReferences, parseCitation } from './references.ts';

const fence = (...lines: string[]) => ['```mdl', ...lines, '```'].join('\n');

describe('references', () => {
  test('a reference field yields one edge per name, a spec reference marked', () => {
    const text = [
      fence(
        'feat a2b3c: Inbox',
        '  depends: [d4e5f, g6h7i]',
        '  spec: echo:///01M6RNZX2K2G2VPAQT0KRRJNZY',
        '  req k8m9n: Sorts.',
      ),
      fence('feat d4e5f: Sync', '  req p2q3r: Syncs.'),
    ].join('\n\n');
    const schemas = resolveBlockSchemas(text, { dialects: ['org.dxos.spec.software'] });
    expect(blockReferences(text, schemas)).toEqual([
      { kind: 'feat', key: 'a2b3c', field: 'depends', target: 'd4e5f', spec: false },
      { kind: 'feat', key: 'a2b3c', field: 'depends', target: 'g6h7i', spec: false },
      { kind: 'feat', key: 'a2b3c', field: 'spec', target: 'echo:///01M6RNZX2K2G2VPAQT0KRRJNZY', spec: true },
    ]);
  });

  test('a citation names a spec by object id or spec id, and an item after #', () => {
    expect(parseCitation('echo://BPBG3/01M6RNZX#k7q2x')).toEqual({ spec: '01M6RNZX', item: 'k7q2x' });
    expect(parseCitation('echo:///01M6RNZX')).toEqual({ spec: '01M6RNZX' });
    expect(parseCitation('org.dxos.plugin.code')).toEqual({ spec: 'org.dxos.plugin.code' });
  });
});
