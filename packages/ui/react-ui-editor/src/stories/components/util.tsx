//
// Copyright 2023 DXOS.org
//

import { type Completion } from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';
import React, { type FC } from 'react';

import { faker } from '@dxos/random';
import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import {
  type EditorSelectionState,
  decorateMarkdown,
  folding,
  formattingKeymap,
  image,
  linkTooltip,
  table,
} from '../../extensions';
import { str } from '../../testing';
import { createRenderer } from '../../util';

export const num = () => faker.number.int({ min: 0, max: 9999 }).toLocaleString();

export const img = '![dxos](https://dxos.network/dxos-logotype-blue.png)';

export const code = str(
  // prettier-ignore
  '// Code',
  'const Component = () => {',
  '  const x = 100;',
  '',
  '  return () => <div>Test</div>;',
  '};',
);

// Content blocks for stories
export const content = {
  tasks: str(
    // prettier-ignore
    '### TaskList',
    '',
    `- [x] ${faker.lorem.sentences()}`,
    `- [ ] ${faker.lorem.sentences()}`,
    `  - [ ] ${faker.lorem.sentences()}`,
    `    - [ ] ${faker.lorem.sentences()}`,
    `    - [x] ${faker.lorem.sentences()}`,
    '',
  ),

  bullets: str(
    // prettier-ignore
    '### BulletList',
    '',
    `- ${faker.lorem.sentences()}`,
    `- ${faker.lorem.sentences()}`,
    `  - ${faker.lorem.sentences()}`,
    `  - ${faker.lorem.sentences()}`,
    `- ${faker.lorem.sentences()}`,
    '',
  ),

  numbered: str(
    // prettier-ignore
    '### OrderedList (part 1)',
    '',
    `1. ${faker.lorem.sentences()}`,
    `1. ${faker.lorem.sentences()}`,
    `1. ${faker.lorem.sentences()}`,
    `    1. ${faker.lorem.sentences()}`,
    `    1. ${faker.lorem.sentences()}`,
    `        1. ${faker.lorem.sentences()}`,
    `1. ${faker.lorem.sentences()}`,
    '',
    '### OrderedList (part 2)',
    '',
    `1. ${faker.lorem.sentences()}`,
    '',
  ),

  typescript: code,

  codeblocks: str(
    // prettier-ignore
    '### Code',
    '',
    '```bash',
    '$ ls -las',
    '```',
    '',
    '```tsx',
    code,
    '```',
    '',
  ),

  comment: str(
    // prettier-ignore
    '### Comment',
    '',
    '<!--',
    'A comment',
    '-->',
    '',
    'Partial comment. <!-- comment. -->',
    '',
  ),

  links: str(
    // prettier-ignore
    '### Links',
    '',
    'This is a naked link https://dxos.org within a sentence.',
    '',
    'Take a look at [DXOS](https://dxos.org) and how to [get started](https://docs.dxos.org/guide/getting-started.html).',
    '',
    'This is all about https://dxos.org and related technologies.',
    '',
  ),

  table: str(
    // prettier-ignore
    '### Tables',
    '',
    `| ${faker.lorem.word().padStart(12)} | ${faker.lorem.word().padStart(12)} | ${faker.lorem.word().padStart(12)} |`,
    `|-${''.padStart(12, '-')}-|-${''.padStart(12, '-')}-|-${''.padStart(12, '-')}-|`,
    `| ${num().padStart(12)} | ${num().padStart(12)} | ${num().padStart(12)} |`,
    `| ${num().padStart(12)} | ${num().padStart(12)} | ${num().padStart(12)} |`,
    `| ${num().padStart(12)} | ${num().padStart(12)} | ${num().padStart(12)} |`,
    '',
  ),

  image: str('### Image', '', img),

  headings: str(
    ...[1, 2, 3, 4, 5, 6].map((level) => ['#'.repeat(level) + ` Heading ${level}`, faker.lorem.sentences(), '']).flat(),
  ),

  formatting: str(
    // prettier-ignore
    '### Formatting',
    '',
    'This this is **bold**, ~~strikethrough~~, _italic_, and `f(INLINE)`.',
    '',
  ),

  blockquotes: str(
    // prettier-ignore
    '### Blockquotes',
    '',
    '> This is a block quote.',
    '',
    '> This is a long wrapping block quote. Neque reiciendis ullam quae error labore sit, at, et, nulla, aut at nostrum omnis quas nostrum, at consectetur vitae eos asperiores non omnis ullam in beatae at vitae deserunt asperiores sapiente.',
    '',
    '> This is ...',
    '... a multi-line ...',
    'block quote.',
    '',
  ),

  paragraphs: str(...faker.helpers.multiple(() => [faker.lorem.paragraph(), ''], { count: 3 }).flat()),

  footer: str('', '', '', '', ''),
};

// Combined text for stories
export const text = str(
  '# Markdown',
  'Composer Markdown Editor',
  '',

  '---',
  '## Basics',
  content.blockquotes,
  content.formatting,
  content.links,

  '---',
  '## Lists',
  content.bullets,
  content.tasks,
  content.numbered,

  '---',
  '## Misc',
  content.codeblocks,
  content.comment,
  content.table,
  content.image,
  content.footer,
  '=== LAST LINE ===',
);

// Shared links for autocomplete
export const links: Completion[] = [
  { label: 'DXOS', apply: '[DXOS](https://dxos.org)' },
  { label: 'GitHub', apply: '[DXOS GitHub](https://github.com/dxos)' },
  { label: 'Automerge', apply: '[Automerge](https://automerge.org/)' },
  { label: 'IPFS', apply: '[Protocol Labs](https://docs.ipfs.tech)' },
  { label: 'StackEdit', apply: '[StackEdit](https://stackedit.io/app)' },
];

export const names = ['adam', 'alice', 'alison', 'bob', 'carol', 'charlie', 'sayuri', 'shoko'];

const hover =
  'rounded-sm text-baseText text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const LinkTooltip: FC<{ url: string }> = ({ url }) => {
  const web = new URL(url);
  return (
    <a href={url} target='_blank' rel='noreferrer' className={mx(hover, 'flex items-center gap-2')}>
      {web.origin}
      <Icon icon='ph--arrow-square-out--regular' size={4} />
    </a>
  );
};

export const renderLinkTooltip = createRenderer(LinkTooltip);

const LinkButton: FC<{ url: string }> = ({ url }) => {
  return (
    <a href={url} target='_blank' rel='noreferrer' className={mx(hover)}>
      <Icon icon='ph--arrow-square-out--regular' size={4} classNames='inline-block mis-1 mb-[3px]' />
    </a>
  );
};

export const renderLinkButton = createRenderer(LinkButton);

// Shared extensions.
export const defaultExtensions: Extension[] = [
  decorateMarkdown({ renderLinkButton, selectionChangeDelay: 100 }),
  formattingKeymap(),
  linkTooltip(renderLinkTooltip),
];

export const allExtensions: Extension[] = [
  decorateMarkdown({ renderLinkButton, selectionChangeDelay: 100, numberedHeadings: { from: 2, to: 4 } }),
  formattingKeymap(),
  linkTooltip(renderLinkTooltip),
  image(),
  table(),
  folding(),
];

// Long text for scrolling stories.
export const longText = faker.helpers
  .multiple(() => faker.lorem.paragraph({ min: 8, max: 16 }), { count: 20 })
  .join('\n\n');

export const largeWithImages = faker.helpers
  .multiple(() => [faker.lorem.paragraph({ min: 12, max: 16 }), img], { count: 20 })
  .flatMap((x) => x)
  .join('\n\n');

export const headings = str(
  ...[1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 2, 3, 3, 2, 2, 6, 1]
    .map((level) => ['#'.repeat(level) + ' ' + faker.lorem.sentence(3), faker.lorem.sentences(), ''])
    .flat(),
);

export const global = new Map<string, EditorSelectionState>();
