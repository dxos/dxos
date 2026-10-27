//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import MARKDOWN_SPEC from '../../../plugin-markdown/PLUGIN.mdl?raw';
import * as FeatureSpec from './FeatureSpec.ts';

const SPEC = `
# Spec

Prose outside a block is ignored.

\`\`\`mdl
feat F-1: Virtualizer invariants
  The properties every binding must hold; each is
  mutation-checked.
  req F-1.1: Prepending moves nothing at or after the anchor.
  req F-1.2: A scroll moves content by exactly what was scrolled,
    including upward from the tail.
\`\`\`

\`\`\`mdl
type Foo
  name: string
\`\`\`

\`\`\`mdl
feat F-2
  req F-2.1: Untitled blocks take their id as the name.
\`\`\`
`;

describe('FeatureSpec', () => {
  test('parse extracts feat blocks with their prose and requirements', ({ expect }) => {
    expect(FeatureSpec.parse(SPEC)).toEqual([
      {
        id: 'F-1',
        name: 'Virtualizer invariants',
        description: 'The properties every binding must hold; each is mutation-checked.',
        requirements: [
          { id: 'F-1.1', text: 'Prepending moves nothing at or after the anchor.' },
          { id: 'F-1.2', text: 'A scroll moves content by exactly what was scrolled, including upward from the tail.' },
        ],
      },
      { id: 'F-2', name: 'F-2', requirements: [{ id: 'F-2.1', text: 'Untitled blocks take their id as the name.' }] },
    ]);
  });

  test('parse reads every feat block of a fence that holds several, nesting dotted ids', ({ expect }) => {
    const text = [
      '```mdl',
      'feat F-3: Search',
      '  req F-3.1: Finds by title.',
      '',
      'op Search.run',
      '  key: run',
      '',
      'feat F-3.1: Ranking',
      '  Orders results.',
      'feat F-3.1.2: Recency',
      'feat F-4.1: Orphan',
      '```',
    ].join('\n');
    expect(FeatureSpec.parse(text)).toEqual([
      { id: 'F-3', name: 'Search', requirements: [{ id: 'F-3.1', text: 'Finds by title.' }] },
      { id: 'F-3.1', name: 'Ranking', description: 'Orders results.', requirements: [], parent: 'F-3' },
      { id: 'F-3.1.2', name: 'Recency', requirements: [], parent: 'F-3.1' },
      { id: 'F-4.1', name: 'Orphan', requirements: [] },
    ]);
  });

  test('parse reads every feature of a real spec', ({ expect }) => {
    expect(FeatureSpec.parse(MARKDOWN_SPEC).length).toBeGreaterThan(5);
  });

  test('getSource replaces any anchor on the path', ({ expect }) => {
    expect(FeatureSpec.getSource('packages/a/PLUGIN.mdl#F-9', 'F-1')).toBe('packages/a/PLUGIN.mdl#F-1');
  });
});
