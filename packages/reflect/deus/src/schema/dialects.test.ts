//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';

// @ts-ignore: a plain-JS build script.
import { dialectModule } from '../../scripts/gen-dialects.mjs';
import {
  SOFTWARE_DIALECT,
  extensionTable,
  parseDialectHeader,
  printExtensionTable,
  resolveBlockSchemas,
} from './dialects.ts';

const fence = (...lines: string[]) => ['```mdl', ...lines, '```'].join('\n');

describe('dialects', () => {
  test('the bundled dialects match lang/', ({ expect }) => {
    const bundled = readFileSync(join(import.meta.dirname, 'gen/dialects.ts'), 'utf8');
    expect(bundled === dialectModule(), 'run `node scripts/gen-dialects.mjs`').toBe(true);
  });

  test('frontmatter extends reads as a list in either form', ({ expect }) => {
    expect(parseDialectHeader('---\nid: a\nextends: [b, c]\n---\n')).toEqual({ id: 'a', extends: ['b', 'c'] });
    expect(parseDialectHeader('---\nid: a\nextends:\n  - b\n  - c\n---\n')).toEqual({ id: 'a', extends: ['b', 'c'] });
  });
});

describe('resolveBlockSchemas', () => {
  test('a spec extending the software dialect gets its kinds, and the dialects they extend', ({ expect }) => {
    const schemas = resolveBlockSchemas('', { dialects: [SOFTWARE_DIALECT] });
    expect(schemas.get('feat')).toMatchObject({
      uri: 'org.dxos.mdl.feat@1.1',
      dialect: SOFTWARE_DIALECT,
      role: 'anchor',
      label: 'F',
      hue: 'emerald',
      inlineProse: true,
    });
    expect(schemas.get('feat')!.fields.find(({ name }) => name === 'spec')?.type).toEqual({
      kind: 'ref',
      to: ['spec'],
      many: false,
    });
    expect(schemas.has('decision')).toBe(true);
  });

  test("a spec's appendix replaces a dialect's definition of a kind", ({ expect }) => {
    const text = fence(
      'ext feat',
      '  uri: org.dxos.mdl.feat@1.0',
      '  desc: Older.',
      '  fields:',
      '    req: RequirementList',
    );
    const feat = resolveBlockSchemas(text, { dialects: [SOFTWARE_DIALECT] }).get('feat')!;
    expect(feat.uri).toBe('org.dxos.mdl.feat@1.0');
    expect(feat.fields.map(({ name }) => name)).toEqual(['req']);
  });

  test('extends merges the parent fields, overridden by and followed by the child', ({ expect }) => {
    const text = [
      fence(
        'ext op',
        '  uri: org.example.op@1.0',
        '  desc: An op.',
        '  role: structure',
        '  fields:',
        '    desc?: Prose',
        '    output?: TypeExpr',
      ),
      fence('ext op', '  uri: org.example.op@1.1', '  extends: op', '  adds-fields:', '    key?: NSID'),
    ].join('\n\n');
    const op = resolveBlockSchemas(text).get('op')!;
    expect(op).toMatchObject({ uri: 'org.example.op@1.1', desc: 'An op.', role: 'structure' });
    expect(op.fields.map(({ name }) => name)).toEqual(['desc', 'output', 'key']);
  });

  test('the Extensions table is derived from the resolved kinds', ({ expect }) => {
    const schemas = resolveBlockSchemas('', { dialects: ['org.dxos.spec.changelog'] });
    expect(extensionTable(schemas)).toEqual([
      { term: 'uses', uri: 'dxos.spec.core/uses' },
      { term: 'decision', uri: 'org.dxos.mdl.decision@1.0' },
      { term: 'question', uri: 'org.dxos.mdl.question@1.0' },
    ]);
    expect(printExtensionTable(extensionTable(schemas)).split('\n')[3]).toBe(
      '| `decision` | `org.dxos.mdl.decision@1.0` |',
    );
  });
});
