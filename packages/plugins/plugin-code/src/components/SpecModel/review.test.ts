//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseReview, reviewAnnotations } from '@dxos/deus/review';

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
      '  tests: [github:dxos/dxos/packages/plugins/plugin-x/src/a.test.ts#opens]',
    ].join('\n'),
  ),
  fence(
    ['verdict F-1.2: No picker yet.', '  status: missing', '  note: |', '    Nothing calls the dialog.'].join('\n'),
  ),
  fence(['verdict Thing: Fields match.', '  status: bogus'].join('\n')),
].join('\n\n');

describe('review annotations', () => {
  test('an item is tested by its tests or a done verdict, untested otherwise unless missing', ({ expect }) => {
    const review = parseReview(
      ['done', 'untested', 'partial', 'missing']
        .map((status) => fence([`verdict ${status}: x`, `  status: ${status}`].join('\n')))
        .join('\n\n'),
    );
    expect(reviewAnnotations(review).map(({ id, testing }) => [id, testing])).toEqual([
      ['done', 'tested'],
      ['untested', 'untested'],
      ['partial', 'untested'],
      ['missing', undefined],
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

describe('implementation annotations', () => {
  test('a review links items to code outside the spec text; a req hangs off its feature', ({ expect }) => {
    const spec = [
      fence(['feat F-1: Open things', '  req F-1.1: The action is registered.'].join('\n')),
      fence('type Thing'),
    ].join('\n\n');
    const annotations = reviewAnnotations(parseReview(REVIEW));
    expect(annotations).toEqual([
      {
        id: 'F-1.1',
        keys: [{ owner: 'dxos', repo: 'dxos', path: 'packages/plugins/plugin-x/src/a.ts', fragment: 'openThing' }],
        testing: 'tested',
        tests: [{ owner: 'dxos', repo: 'dxos', path: 'packages/plugins/plugin-x/src/a.test.ts', fragment: 'opens' }],
      },
      // Missing: no code, and nothing to say about tests.
      { id: 'F-1.2', keys: [] },
    ]);
    const graph = buildDefinitionGraph(spec, new Map(), annotations);
    const code = 'github:dxos/dxos/packages/plugins/plugin-x/src/a.ts#openThing';
    expect(graph.definitions.find(({ id }) => id === 'F-1')?.dependsOn).toEqual([code]);
    expect(graph.definitions.find(({ id }) => id === code)).toMatchObject({
      kind: 'code',
      external: { target: 'code' },
    });
    // Without annotations the spec text names no code, so there is no code box.
    expect(buildDefinitionGraph(spec).definitions.some(({ kind }) => kind === 'code')).toBe(false);
  });
});
