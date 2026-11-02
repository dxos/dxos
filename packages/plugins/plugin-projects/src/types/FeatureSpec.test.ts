//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

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

  test('getSource replaces any anchor on the path', ({ expect }) => {
    expect(FeatureSpec.getSource('packages/a/PLUGIN.mdl#F-9', 'F-1')).toBe('packages/a/PLUGIN.mdl#F-1');
  });
});
