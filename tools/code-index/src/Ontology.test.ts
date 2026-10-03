//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { escapeFragment, escapePath } from './internal/iri.ts';
import * as Ontology from './Ontology.ts';

const BASE = 'https://dxos.org/';

const relative = (iri: { value: string }) => iri.value.slice(BASE.length);

describe('IRI escaping', () => {
  test('`/`, `@` and `:` stay literal', () => {
    expect(escapePath('@dxos/compute/Operation')).toEqual('@dxos/compute/Operation');
    expect(escapePath('node:fs/promises')).toEqual('node:fs/promises');
  });

  test('reserved characters are percent-encoded', () => {
    expect(escapePath('a%b#c?d e<f>g"h{i}j|k^l`m')).toEqual('a%25b%23c%3Fd%20e%3Cf%3Eg%22h%7Bi%7Dj%7Ck%5El%60m');
    expect(escapeFragment('tab\tnew\nline\u0000nul\u007fdel')).toEqual('tab%09new%0Aline%00nul%7Fdel');
  });

  test('Windows separators become `/`', () => {
    expect(escapePath('src\\worker\\Protocol.ts')).toEqual('src/worker/Protocol.ts');
  });

  test('a `.` or `..` segment is escaped, a dot inside a segment is not', () => {
    expect(escapePath('a/./b/../c')).toEqual('a/%2E/b/%2E%2E/c');
    expect(escapePath('.agents/skills/x.md')).toEqual('.agents/skills/x.md');
    expect(escapePath('..')).toEqual('%2E%2E');
  });

  test('a private member cannot open a second fragment', () => {
    expect(escapeFragment('#field')).toEqual('%23field');
    expect(relative(Ontology.symbolIri('src/Store.ts', '#inFlight'))).toEqual('deus/file/src/Store.ts#%23inFlight');
  });
});

describe('resource IRIs', () => {
  test('each kind reads like the path or import it names', () => {
    expect(relative(Ontology.fileIri('packages/sdk/app-framework/src/core/capability.ts'))).toEqual(
      'deus/file/packages/sdk/app-framework/src/core/capability.ts',
    );
    expect(relative(Ontology.symbolIri('src/worker/Protocol.ts', 'Rpcs'))).toEqual(
      'deus/file/src/worker/Protocol.ts#Rpcs',
    );
    expect(relative(Ontology.packageIri('@dxos/echo'))).toEqual('deus/package/@dxos/echo');
    expect(relative(Ontology.memberIri('@dxos/compute/Operation', 'make'))).toEqual(
      'deus/module/@dxos/compute/Operation#make',
    );
    expect(relative(Ontology.memberIri('effect/rpc/RpcGroup', 'make'))).toEqual('deus/module/effect/rpc/RpcGroup#make');
    expect(relative(Ontology.memberIri('@dxos/echo', 'Type.Obj'))).toEqual('deus/module/@dxos/echo#Type.Obj');
    expect(relative(Ontology.graphIri('src/Store.ts', 1727950000000))).toEqual(
      'deus/graph/file/src/Store.ts#1727950000000',
    );
    expect(relative(Ontology.derivedGraphIri('10-effect'))).toEqual('deus/graph/derived/10-effect');
  });

  test('a spec block splits on its first `:`, so only the block type escapes one', () => {
    expect(relative(Ontology.specBlockIri('tools/code-index/SPEC.mdl', 'feature', 'incremental'))).toEqual(
      'deus/file/tools/code-index/SPEC.mdl#feature:incremental',
    );
    expect(relative(Ontology.specBlockIri('a.mdl', 'x:y', 'k:v'))).toEqual('deus/file/a.mdl#x%3Ay:k:v');
  });

  test('no file path names a derived graph', () => {
    const graph = Ontology.graphIri('derived/10-effect', 1).value;
    expect(Ontology.isDerivedGraph(graph)).toBe(false);
    expect(graph.startsWith(Ontology.FILE_GRAPH_PREFIX)).toBe(true);
    expect(Ontology.isDerivedGraph(Ontology.derivedGraphIri('10-effect').value)).toBe(true);
  });
});
