//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { globPattern } from './internal/glob.ts';
import * as Mdl from './Mdl.ts';
import * as Ontology from './Ontology.ts';
import { analyzeMdl } from './worker/analyzers/spec.ts';

const DOCUMENT = `---
id: org.dxos.code-index
name: CodeIndex
version: 0.11.1
extends: [org.dxos.spec.core]
tags: [tool, index]
---

Prose mentioning \`Store.layer\` outside any block.

## Extensions

| Term     | URI                       |
|----------|---------------------------|
| \`op\`     | \`org.dxos.mdl.op@1.1\`     |
| \`feat\`   | org.dxos.mdl.feat@1.0     |

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
  A store is initialized from a directory path.

  req F-1.1: Opening a store creates the directory
    if it does not exist.
  req F-1.2:
    when: a second store opens the directory
    then: it reads what the first wrote
\`\`\`

\`\`\`mdl
op create
  key: org.dxos.operation.markdown.create
  input: { name: string, content?: string }
  output: {
    id: string    # the new document's DXN
  }
  effects: [echo:write]

op open
  key: org.dxos.operation.markdown.open
\`\`\`

\`\`\`mdl
scenario T-1: Store
  given: an empty directory
  then:
    - \`putDocument\` lands in the ledger
    - the graph holds the
      document
  tags: [F-1, F-1.1]
\`\`\`

\`\`\`mdl
test QA-1: Round trip
  automated:
    - composer-e2e:basic.spec.ts#Basic tests › create document
  steps:
    - name: Create
      invoke: [op:create] { name: "x" }   # the agent path
\`\`\`

\`\`\`mdl
rule no-casts: Never cast to silence the checker
  A cast hides a real type error.
  Source: 4 review comments.
  scope: dir
  files:
    - src/**/*.ts
\`\`\`
`;

/** Every field of a list, depth-first, as `path=value`. */
const flat = (fields: readonly Mdl.Field[], prefix = ''): string[] =>
  fields.flatMap((field) => {
    const path = `${prefix}${field.key ?? field.index}`;
    return [`${path}=${field.value ?? ''}`, ...flat(field.fields, `${path}.`)];
  });

describe('Mdl', () => {
  const parsed = Mdl.parse(DOCUMENT);
  const all = Mdl.flatten(parsed.blocks).map(({ block }) => block);
  const byId = (id: string) => all.find((block) => block.id === id);

  test('frontmatter is read as YAML, lists kept', () => {
    expect(parsed.frontmatter).toEqual({
      id: 'org.dxos.code-index',
      name: 'CodeIndex',
      version: '0.11.1',
      extends: ['org.dxos.spec.core'],
      tags: ['tool', 'index'],
    });
  });

  test('the Extensions table maps block types to URIs', () => {
    expect(parsed.extensions).toEqual([
      { term: 'op', uri: 'org.dxos.mdl.op@1.1' },
      { term: 'feat', uri: 'org.dxos.mdl.feat@1.0' },
    ]);
  });

  test('a fence holds several blocks, and req blocks nest in their feat', () => {
    expect(all.map((block) => [block.type, block.id])).toEqual([
      ['module', 'Store'],
      ['feat', 'F-1'],
      ['req', 'F-1.1'],
      ['req', 'F-1.2'],
      ['op', 'create'],
      ['op', 'open'],
      ['scenario', 'T-1'],
      ['test', 'QA-1'],
      ['rule', 'no-casts'],
    ]);
    const feat = byId('F-1');
    expect(feat?.prose).toEqual('A store is initialized from a directory path.');
    expect(feat?.blocks.map((block) => block.id)).toEqual(['F-1.1', 'F-1.2']);
    expect(byId('F-1.1')?.title).toEqual('Opening a store creates the directory if it does not exist.');
    expect(flat(byId('F-1.2')?.fields ?? [])).toEqual([
      'when=a second store opens the directory',
      'then=it reads what the first wrote',
    ]);
    expect(byId('F-1.2')?.line).toEqual(35);
  });

  test('nesting, block scalars and comments', () => {
    expect(flat(byId('Store')?.fields ?? [])).toEqual([
      'desc=The entire persistence surface.',
      'api=',
      'api.layer=(dir) => Layer<Store, StoreError>',
      'api.putDocument=(FileDocument) => Effect<void>',
    ]);
  });

  test('flow maps and lists become children, a map left open runs to its closer', () => {
    expect(flat(byId('create')?.fields ?? [])).toEqual([
      'key=org.dxos.operation.markdown.create',
      'input=',
      'input.name=string',
      'input.content=string',
      'output=',
      'output.id=string',
      'effects=',
      'effects.0=echo:write',
    ]);
    expect(byId('create')?.fields[1].fields[1].optional).toBe(true);
  });

  test('list items, wrapped items and list-of-map items', () => {
    expect(flat(byId('T-1')?.fields ?? [])).toEqual([
      'given=an empty directory',
      'then=',
      'then.0=`putDocument` lands in the ledger',
      'then.1=the graph holds the document',
      'tags=',
      'tags.0=F-1',
      'tags.1=F-1.1',
    ]);
    expect(byId('T-1')?.mentions).toEqual(['putDocument']);
    expect(flat(byId('QA-1')?.fields ?? [])).toEqual([
      'automated=',
      'automated.0=composer-e2e:basic.spec.ts#Basic tests › create document',
      'steps=',
      'steps.0=',
      'steps.0.name=Create',
      'steps.0.invoke=[op:create] { name: "x" }',
    ]);
  });

  test('a capitalised `Source:` line in rule prose stays prose', () => {
    const rule = byId('no-casts');
    expect(rule?.prose).toEqual('A cast hides a real type error.\nSource: 4 review comments.');
    expect(flat(rule?.fields ?? [])).toEqual(['scope=dir', 'files=', 'files.0=src/**/*.ts']);
  });

  test('a block type that is not a name still yields a legal IRI', () => {
    // `packages/reflect/deus/lang/core.mdl` documents the grammar with a block headed `<type> …`,
    // and an unencoded `<` in an IRI is rejected by every N3 parser downstream.
    const document = analyzeMdl({
      root: '/repo',
      path: 'lang/core.mdl',
      source: '```mdl\n<type> [<id>][: <title>]\n```\n',
      mtime: 1,
      resolve: () => undefined,
      packageOf: () => undefined,
    });
    const id = document.declaresBlock?.[0]['@id'] ?? '';
    expect(id).not.toMatch(/[<>]/);
    expect(id).toContain('%3Ctype%3E');
  });

  test('the spec analyzer emits the file facts, block nodes and the field tree', () => {
    const path = 'tools/code-index/SPEC.mdl';
    const document = analyzeMdl({
      root: '/repo',
      path,
      source: DOCUMENT,
      mtime: 1,
      resolve: () => undefined,
      packageOf: () => '@dxos/code-index',
    });
    expect(document).toMatchObject({
      language: 'mdl',
      specId: 'org.dxos.code-index',
      specName: 'CodeIndex',
      specVersion: '0.11.1',
      specExtends: ['org.dxos.spec.core'],
      frontmatter: ['tags=tool', 'tags=index'],
      usesExtension: [
        {
          '@id': Ontology.extensionUseIri(path, 'op').value,
          'term': 'op',
          'extension': {
            '@id': Ontology.extensionIri('org.dxos.mdl.op@1.1').value,
            'extensionUri': 'org.dxos.mdl.op@1.1',
          },
        },
        { term: 'feat', extension: { extensionUri: 'org.dxos.mdl.feat@1.0' } },
      ],
    });
    const blocks = document.declaresBlock ?? [];
    expect(blocks).toHaveLength(9);
    const store = Ontology.specBlockIri(path, 'module', 'Store').value;
    expect(blocks[0]).toMatchObject({
      '@id': store,
      'blockType': 'module',
      'name': 'Store',
      'line': 21,
      'inPackage': Ontology.packageIri('@dxos/code-index').value,
    });
    expect(blocks[0].hasField[1]).toMatchObject({
      '@id': Ontology.specFieldIri(store, 'api').value,
      'key': 'api',
      'fieldPath': 'api',
      'hasField': [{ '@id': Ontology.specFieldIri(store, 'api.layer').value, 'fieldPath': 'api.layer' }, {}],
    });
    const feat = Ontology.specBlockIri(path, 'feat', 'F-1').value;
    expect(blocks[2]).toMatchObject({ blockType: 'req', blockId: 'F-1.1', partOf: feat });

    const test = blocks.find((block) => block.blockId === 'QA-1');
    expect(test?.hasField[0].hasField?.[0]).toMatchObject({
      index: 0,
      fieldPath: 'automated.0',
      refScope: 'composer-e2e',
      refTarget: 'basic.spec.ts',
      refFragment: 'Basic tests › create document',
    });
    const rule = blocks.find((block) => block.blockType === 'rule');
    expect(rule?.hasField[1].hasField?.[0]).toMatchObject({
      repoGlob: { '@id': Ontology.globIri('src/**/*.ts').value, 'pathPattern': '^src/(?:.*/)?[^/]*\\.ts$' },
      dirGlob: { glob: 'tools/code-index/src/**/*.ts' },
    });
  });
});

describe('globPattern', () => {
  const matches = (glob: string, path: string) => new RegExp(globPattern(glob)).test(path);

  test('`**/` spans zero or more directories, `*` stays in one', () => {
    expect(matches('packages/**/src/**/*.ts', 'packages/a/src/b.ts')).toBe(true);
    expect(matches('packages/**/src/**/*.ts', 'packages/a/b/src/c/d.ts')).toBe(true);
    expect(matches('packages/**/src/**/*.ts', 'packages/a/src/b.tsx')).toBe(false);
    expect(matches('src/*.ts', 'src/a/b.ts')).toBe(false);
    expect(matches('packages/**/*Operation.ts', 'packages/x/MyOperation.ts')).toBe(true);
  });

  test('braces are alternatives, regex characters are literal', () => {
    expect(matches('src/*.{ts,tsx}', 'src/a.tsx')).toBe(true);
    expect(matches('a+b/(c).ts', 'a+b/(c).ts')).toBe(true);
    expect(matches('a.ts', 'abts')).toBe(false);
  });
});

/**
 * The parser's contract is that no document in the repository can make it fail; every tracked
 * `.mdl` is run through it, and through the analyzer, whose output must decode as a document.
 */
describe('every tracked .mdl', () => {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const paths = execFileSync('git', ['ls-files', '*.mdl'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((path) => path !== '');

  test('parses without error and yields its blocks', () => {
    expect(paths.length).toBeGreaterThan(0);
    let blocks = 0;
    for (const path of paths) {
      const source = readFileSync(join(root, path), 'utf8');
      const document = analyzeMdl({
        root,
        path,
        source,
        mtime: 1,
        resolve: () => undefined,
        packageOf: () => undefined,
      });
      // The worker ships documents as JSON through this schema; a shape it rejects never lands.
      const decoded = Schema.decodeUnknownSync(Ontology.FileDocument)(JSON.parse(JSON.stringify(document)));
      const ids = (decoded.declaresBlock ?? []).map((block) => block['@id']);
      expect(new Set(ids).size, path).toEqual(ids.length);
      blocks += ids.length;
    }
    expect(blocks).toBeGreaterThan(paths.length);
  });
});
