//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { findSymbolLine } from '../CodeView/symbol.ts';
import { parseReview, statusOf, summarizeReview } from './review.ts';
import { buildDefinitionGraph } from './spec-model.ts';

const fence = (body: string) => ['```mdl', body, '```'].join('\n');

const REVIEW = [
  '---',
  'spec: github:dxos/dxos/packages/plugins/plugin-x/PLUGIN.mdl',
  'commit: 0123456789abcdef',
  'date: 2026-10-22',
  'by: agent:claude-code',
  '---',
  '',
  fence(
    [
      'verdict F-1.1: The action is registered.',
      '  status: done',
      '  evidence: [github:dxos/dxos/packages/plugins/plugin-x/src/a.ts#openThing]',
    ].join('\n'),
  ),
  fence(
    ['verdict F-1.2: No picker yet.', '  status: missing', '  note: |', '    Nothing calls the dialog.'].join('\n'),
  ),
  fence(['verdict Thing: Fields match.', '  status: bogus'].join('\n')),
].join('\n\n');

describe('review', () => {
  test('parses frontmatter and verdicts, dropping unknown statuses', ({ expect }) => {
    const review = parseReview(REVIEW);
    expect(review).toMatchObject({ commit: '0123456789abcdef', by: 'agent:claude-code' });
    expect(review.verdicts).toEqual([
      {
        id: 'F-1.1',
        status: 'done',
        summary: 'The action is registered.',
        evidence: ['github:dxos/dxos/packages/plugins/plugin-x/src/a.ts#openThing'],
      },
      { id: 'F-1.2', status: 'missing', summary: 'No picker yet.', evidence: [], note: 'Nothing calls the dialog.' },
    ]);
  });

  test('reads evidence wrapped over several lines or as list items', ({ expect }) => {
    const wrapped = fence(
      ['verdict T: Ok.', '  status: done', '  evidence:', '    [github:o/r/a.ts#A,', '     github:o/r/b.ts#B]'].join(
        '\n',
      ),
    );
    const items = fence(['verdict U: Ok.', '  status: done', '  evidence:', '    - github:o/r/c.ts#C'].join('\n'));
    expect(parseReview(`${wrapped}\n\n${items}`).verdicts.map(({ evidence }) => evidence)).toEqual([
      ['github:o/r/a.ts#A', 'github:o/r/b.ts#B'],
      ['github:o/r/c.ts#C'],
    ]);
  });

  test('a feature takes the worst status of its requirements', ({ expect }) => {
    const review = parseReview(REVIEW);
    expect(statusOf(review, 'F-1')).toBe('missing');
    expect(statusOf(review, 'F-1.1')).toBe('done');
    expect(statusOf(review, 'F-2')).toBeUndefined();
    expect(summarizeReview(review)).toEqual([
      { status: 'done', count: 1 },
      { status: 'missing', count: 1 },
    ]);
  });
});

describe('external definitions', () => {
  const spec =
    fence(
      [
        'feat F-1: Open things',
        '  desc: Stores a github:dxos/dxos/packages/core/echo/echo/SPEC.mdl#Obj via',
        '    github:dxos/dxos/packages/sdk/types/src/types/Spec.ts#make and the local Thing.',
      ].join('\n'),
    ) +
    '\n\n' +
    fence('type Thing');

  test('a key to another spec becomes that spec’s block, described when its text is known', ({ expect }) => {
    const other = fence('type Obj: An ECHO object.');
    const graph = buildDefinitionGraph(spec, new Map([['github:dxos/dxos/packages/core/echo/echo/SPEC.mdl', other]]));
    const external = graph.definitions.find(({ id }) => id === 'github:dxos/dxos/packages/core/echo/echo/SPEC.mdl#Obj');
    expect(external).toMatchObject({
      kind: 'type',
      title: 'An ECHO object.',
      external: { target: 'spec', resolved: true },
    });
    const code = graph.definitions.find(({ kind }) => kind === 'code');
    expect(code).toMatchObject({ title: 'make', external: { target: 'code', fragment: 'make' } });
    expect(graph.definitions.find(({ id }) => id === 'F-1')?.dependsOn).toEqual([
      'Thing',
      'github:dxos/dxos/packages/core/echo/echo/SPEC.mdl#Obj',
      'github:dxos/dxos/packages/sdk/types/src/types/Spec.ts#make',
    ]);
  });

  test('an unknown spec still yields a node, marked unresolved', ({ expect }) => {
    const graph = buildDefinitionGraph(spec);
    expect(graph.definitions.find(({ external }) => external?.target === 'spec')).toMatchObject({
      kind: 'spec',
      external: { resolved: false },
    });
  });
});

describe('symbol lookup', () => {
  const source = [
    'import x from "y";',
    '',
    'export class Spec {',
    '  static make(): Spec {',
    '    return new Spec();',
    '  }',
    '}',
    '',
    'export const make = () => Spec.make();',
  ].join('\n');

  test('finds declarations before mentions, and members after their owner', ({ expect }) => {
    expect(findSymbolLine(source, 'Spec')).toBe(3);
    expect(findSymbolLine(source, 'make')).toBe(9);
    expect(findSymbolLine(source, 'Spec.make')).toBe(4);
    expect(findSymbolLine(source, 'Missing')).toBeUndefined();
  });
});
