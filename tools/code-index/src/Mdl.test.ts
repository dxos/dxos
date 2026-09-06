//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Mdl from './Mdl.ts';
import * as Ontology from './Ontology.ts';
import { analyzeMdl } from './worker/analyzers/spec.ts';

const DOCUMENT = `---
id: org.dxos.code-index
name: CodeIndex
version: 0.11.1
---

Prose mentioning \`Store.layer\` outside any block.

## Modules

\`\`\`mdl
module Store
  desc: |
    The entire persistence surface.
  api:
    layer: (dir) => Layer<Store, StoreError>   # opens both databases.
    putDocument: (FileDocument) => Effect<void>
\`\`\`

\`\`\`mdl
feat F-1: One directory, two databases
  desc: A store is initialized from a directory path.
  req F-1.1: Opening a store creates the directory if it does not exist.
\`\`\`

\`\`\`mdl
test T-1: Store
  file: src/Store.test.ts
  cases:
    - \`putDocument\` lands in the ledger
\`\`\`
`;

describe('Mdl', () => {
  const parsed = Mdl.parse(DOCUMENT);

  test('frontmatter is read as flat strings', () => {
    expect(parsed.frontmatter).toEqual({ id: 'org.dxos.code-index', name: 'CodeIndex', version: '0.11.1' });
  });

  test('every fenced block yields a header, fields and mentions', () => {
    expect(parsed.blocks.map((block) => [block.type, block.id, block.title])).toEqual([
      ['module', 'Store', undefined],
      ['feat', 'F-1', 'One directory, two databases'],
      ['test', 'T-1', 'Store'],
    ]);
    expect(parsed.blocks[0].fields).toEqual([
      'desc=|',
      'api=',
      'layer=(dir) => Layer<Store, StoreError>   # opens both databases.',
      'putDocument=(FileDocument) => Effect<void>',
    ]);
    expect(parsed.blocks[2].mentions).toEqual(['putDocument']);
    expect(parsed.blocks[0].line).toEqual(12);
  });

  test('the spec analyzer turns blocks into SpecBlock nodes', () => {
    const document = analyzeMdl({
      root: '/repo',
      path: 'tools/code-index/SPEC.mdl',
      source: DOCUMENT,
      mtime: 1,
      resolve: () => undefined,
      packageOf: () => '@dxos/code-index',
    });
    expect(document.language).toEqual('mdl');
    expect(document.declaresBlock).toHaveLength(3);
    expect(document.declaresBlock?.[0]).toEqual({
      '@id': Ontology.specBlockIri('tools/code-index/SPEC.mdl', 'module', 'Store').value,
      '@type': 'SpecBlock',
      'blockType': 'module',
      'name': 'Store',
      'field': parsed.blocks[0].fields,
      'mentions': [],
      'inPackage': Ontology.packageIri('@dxos/code-index').value,
    });
    expect(document.declaresBlock?.[1]).toMatchObject({
      blockType: 'feat',
      blockId: 'F-1',
      name: 'One directory, two databases',
    });
  });
});
