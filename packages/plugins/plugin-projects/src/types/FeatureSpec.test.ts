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
    expect(FeatureSpec.parse(SPEC).map(({ from: _from, to: _to, ...feature }) => feature)).toEqual([
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

  test('parse reads a status line and the range of each fence', ({ expect }) => {
    const text =
      'Prose.\n\n```mdl\nfeat F-3: Archive\n  status: prototype\n  req F-3.1: Archived mail leaves the inbox.\n```\n';
    const [feature] = FeatureSpec.parse(text);
    expect(feature).toMatchObject({ id: 'F-3', name: 'Archive', status: 'prototype' });
    expect(feature.description).toBeUndefined();
    expect(text.slice(feature.from, feature.to)).toBe(text.slice(text.indexOf('```'), text.lastIndexOf('```') + 3));
  });

  test('print writes a block that parse reads back, numbering requirements without an id', ({ expect }) => {
    const printed = FeatureSpec.print('F-4', {
      name: 'Search',
      status: 'planned',
      description: 'Finds mail by any word.\n\nIncludes attachments.',
      requirements: [{ text: 'Results arrive within a second.' }, { id: 'F-4.9', text: 'Typos still match.' }],
    });
    const [feature] = FeatureSpec.parse(printed);
    expect(feature).toMatchObject({
      id: 'F-4',
      name: 'Search',
      status: 'planned',
      description: 'Finds mail by any word.\n\nIncludes attachments.',
      requirements: [
        { id: 'F-4.1', text: 'Results arrive within a second.' },
        { id: 'F-4.9', text: 'Typos still match.' },
      ],
    });
  });

  test('update keeps every line it has no change for, and rewrites only those it does', ({ expect }) => {
    const block = [
      '```mdl',
      'feat F-3: CodeArticle',
      '',
      '  req F-3.1: Uses the editor',
      '             from react-ui-editor.',
      '  req F-3.2:',
      '    when: a spec is opened',
      '    then: it is editable',
      '```',
    ].join('\n');
    const [before] = FeatureSpec.parse(block);
    expect(FeatureSpec.update(block, before)).toBe(block);

    const [, second] = before.requirements;
    expect(
      FeatureSpec.update(block, {
        ...before,
        name: 'Code article',
        status: 'operational',
        requirements: [second, { id: 'F-3.1', text: 'Uses Editor.Root.' }, { text: 'Opens fast.' }],
      }),
    ).toBe(
      [
        '```mdl',
        'feat F-3: Code article',
        '  status: operational',
        '',
        '  req F-3.2:',
        '    when: a spec is opened',
        '    then: it is editable',
        '  req F-3.1: Uses Editor.Root.',
        '  req F-3.3: Opens fast.',
        '```',
      ].join('\n'),
    );
  });

  test('getSource replaces any anchor on the path', ({ expect }) => {
    expect(FeatureSpec.getSource('packages/a/PLUGIN.mdl#F-9', 'F-1')).toBe('packages/a/PLUGIN.mdl#F-1');
  });
});
