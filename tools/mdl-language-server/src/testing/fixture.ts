//
// Copyright 2026 DXOS.org
//

import { type Hover, type InlayHintLabelPart } from 'vscode-languageserver';

const fence = (...lines: string[]) => ['```mdl', ...lines, '```'].join('\n');

/** A spec, its review, a spec it uses and the code the review cites, at repo-relative paths. */
export const FILES: Record<string, string> = {
  'packages/a/SPEC.mdl': [
    '---',
    'id: org.dxos.spec.a',
    '---',
    '',
    '# Spec A',
    '',
    '## Dependencies',
    '',
    fence('uses org.dxos.spec.b: Things it stores.'),
    '',
    '## Features',
    '',
    fence(
      'feat F-1: Open things',
      '  req F-1.1: The action is registered.',
      '  req F-1.2: A picker chooses the thing.',
    ),
    '',
    fence('type Thing', '  fields:', '    other: org.dxos.spec.b#Other'),
    '',
    fence('widget W-1: Not a block type.'),
    '',
    'See [F-1.2] and github:dxos/dxos/packages/a/src/a.ts#openThing and github:dxos/dxos/packages/a/src/a.ts#gone.',
    '',
  ].join('\n'),
  'packages/a/SPEC.review.mdl': [
    '---',
    'spec: github:dxos/dxos/packages/a/SPEC.mdl',
    'commit: 0123456789abcdef',
    '---',
    '',
    fence(
      'verdict F-1.1: The action is registered.',
      '  status: done',
      '  evidence: [github:dxos/dxos/packages/a/src/a.ts#openThing]',
      '  tests: [github:dxos/dxos/packages/a/src/a.test.ts]',
    ),
    '',
    fence('verdict Thing: No storage yet.', '  status: missing', '  note: Nothing writes it.'),
    '',
    fence('verdict Bogus: Not in the spec.', '  status: sideways'),
    '',
  ].join('\n'),
  'packages/b/SPEC.mdl': [
    '---',
    'id: org.dxos.spec.b',
    '---',
    '',
    fence('type Other: Another thing.', '  fields:', '    name: string'),
    '',
  ].join('\n'),
  'packages/a/src/a.ts': [
    '//',
    '// Copyright 2026 DXOS.org',
    '//',
    '',
    'export const openThing = () => {',
    "  return 'thing';",
    '};',
    '',
  ].join('\n'),
  'packages/a/src/a.test.ts': ["test('opens', () => {});", ''].join('\n'),
};

/** The markdown of a hover, which this server always sends as `MarkupContent`. */
export const hoverText = (hover: Hover | null | undefined): string => {
  const contents = hover?.contents;
  return contents && typeof contents === 'object' && 'kind' in contents ? contents.value : '';
};

/** An inlay hint's label as one string. */
export const hintText = (label: string | InlayHintLabelPart[]): string =>
  typeof label === 'string' ? label : label.map(({ value }) => value).join('');
