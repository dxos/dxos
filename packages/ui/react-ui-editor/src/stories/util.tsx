//
// Copyright 2023 DXOS.org
//

import { type Completion } from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import React, { type ReactNode, useEffect, useState, type FC, forwardRef, useImperativeHandle } from 'react';

import { Expando } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { live } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { useThemeContext, Icon } from '@dxos/react-ui';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { editorSlots, editorGutter } from '../defaults';
import {
  type DebugNode,
  type EditorSelectionState,
  createDataExtensions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  debugTree,
  folding,
  formattingKeymap,
  image,
  linkTooltip,
  table,
  type ThemeExtensionsOptions,
} from '../extensions';
import { useTextEditor, type UseTextEditorProps } from '../hooks';
import { str } from '../testing';
import { createRenderer } from '../util';

export const num = () => faker.number.int({ min: 0, max: 9999 }).toLocaleString();

export const img = '![dxos](https://dxos.network/dxos-logotype-blue.png)';

export const code = str(
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
    //
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
    //
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
    //
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

  codeblocks: str('### Code', '', '```bash', '$ ls -las', '```', '', '```tsx', code, '```', ''),

  comment: str('<!--', 'A comment', '-->', '', 'No comment.', 'Partial comment. <!-- comment. -->'),

  links: str(
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

  formatting: str('### Formatting', '', 'This this is **bold**, ~~strikethrough~~, _italic_, and `f(INLINE)`.', ''),

  blockquotes: str(
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

// Shared extensions
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

// Long text for scrolling stories
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

// Type definitions
export type DebugMode = 'raw' | 'tree' | 'raw+tree';

const defaultId = 'editor-' + PublicKey.random().toHex().slice(0, 8);

export type StoryProps = {
  id?: string;
  debug?: DebugMode;
  debugCustom?: (view: EditorView) => ReactNode;
  text?: string;
  readOnly?: boolean;
  placeholder?: string;
  lineNumbers?: boolean;
  onReady?: (view: EditorView) => void;
} & Pick<UseTextEditorProps, 'scrollTo' | 'selection' | 'extensions'> &
  Pick<ThemeExtensionsOptions, 'slots'>;

/**
 * Default story component
 */
export const EditorStory = forwardRef<EditorView | undefined, StoryProps>(
  (
    {
      id = defaultId,
      debug,
      debugCustom,
      text,
      readOnly,
      placeholder = 'New document.',
      lineNumbers,
      scrollTo,
      selection,
      extensions,
      slots = editorSlots,
      onReady,
    },
    forwardedRef,
  ) => {
    const [object] = useState(createObject(live(Expando, { content: text ?? '' })));
    const { themeMode } = useThemeContext();
    const [tree, setTree] = useState<DebugNode>();
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        initialValue: text,
        extensions: [
          createDataExtensions({ id, text: createDocAccessor(object, ['content']) }),
          createBasicExtensions({ readOnly, placeholder, lineNumbers, scrollPastEnd: true }),
          createMarkdownExtensions({ themeMode }),
          createThemeExtensions({
            themeMode,
            syntaxHighlighting: true,
            slots,
          }),
          editorGutter,
          extensions || [],
          debug ? debugTree(setTree) : [],
        ],
        scrollTo,
        selection,
      }),
      [object, extensions, themeMode],
    );

    useImperativeHandle(forwardedRef, () => view, [view]);

    useEffect(() => {
      if (view) {
        onReady?.(view);
      }
    }, [view]);

    return (
      <div className={mx('w-full h-full grid overflow-hidden', debug && 'grid-cols-2 lg:grid-cols-[1fr_600px]')}>
        <div role='none' className='flex overflow-hidden' ref={parentRef} {...focusAttributes} />
        {debug && (
          <div className='grid h-full auto-rows-fr border-l border-separator divide-y divide-separator overflow-hidden'>
            {view && debugCustom?.(view)}
            {(debug === 'raw' || debug === 'raw+tree') && (
              <pre className='p-1 text-xs text-green-800 dark:text-green-200 overflow-auto'>
                {view?.state.doc.toString()}
              </pre>
            )}
            {(debug === 'tree' || debug === 'raw+tree') && <JsonFilter data={tree} classNames='p-1 text-xs' />}
          </div>
        )}
      </div>
    );
  },
);
