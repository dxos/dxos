//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { type EditorView } from '@codemirror/view';
import { faker } from '@faker-js/faker';
import { ArrowSquareOut } from '@phosphor-icons/react';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { type FC, StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { TextObject } from '@dxos/echo-schema';
import { keySymbols, parseShortcut } from '@dxos/keyboard';
import { PublicKey } from '@dxos/keys';
import { fixedInsetFlexLayout, getSize, groupSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor, type TextEditorProps } from './TextEditor';
import {
  autocomplete,
  blast,
  code,
  comments,
  defaultOptions,
  hr,
  image,
  link,
  mention,
  table,
  tasklist,
  typewriter,
  type CommentsOptions,
  type LinkOptions,
  useComments,
} from '../../extensions';
import { type Comment, useTextModel } from '../../hooks';

// Extensions:
// TODO(burdon): Table of contents.
// TODO(burdon): Front-matter

faker.seed(101);

const str = (...lines: string[]) => lines.join('\n');

const num = () => faker.number.int({ min: 0, max: 9999 }).toLocaleString();

// prettier-ignore
const text = {
  tasks: str(
    '## Tasks',
    '',
    '- [x] decorator',
    '- [ ] checkbox',
    '  - [ ] state',
    '    - [ ] indent',
    '    - [x] style',
    '',
  ),

  list: str(
    '## List',
    '',
    '- new york',
    '- london',
    '- tokyo',
    '',
  ),

  numbered: str(
    '## Numbered',
    '',
    '1. one',
    '2. two',
    '3. three',
    ''
  ),

  code: str(
    '## Code',
    '',
    '```',
    'const x = 100;',
    '```',
    '',
    '```tsx',
    'const Component = () => {',
    '  const x = 100;',
    '',
    '  return () => <div>Test</div>;',
    '};',
    '```',
    '',
  ),

  links: str(
    '## Links',
    '',
    'This is a naked link https://dxos.org within a sentence.',
    '',
    'Take a look at [DXOS](https://dxos.org) and how to [get started](https://docs.dxos.org/guide/getting-started.html).',
    '',
  ),

  table: str(
    '# Table',
    '',
    `| ${faker.lorem.word().padStart(12)} | ${faker.lorem.word().padStart(12)} | ${faker.lorem.word().padStart(12)} |`,
    `|-${''.padStart(12, '-')}-|-${''.padStart(12, '-')}-|-${''.padStart(12, '-')}-|`,
    `| ${num().padStart(12)} | ${num().padStart(12)} | ${num().padStart(12)} |`,
    `| ${num().padStart(12)} | ${num().padStart(12)} | ${num().padStart(12)} |`,
    `| ${num().padStart(12)} | ${num().padStart(12)} | ${num().padStart(12)} |`,
    '', // TODO(burdon): Possible GFM parsing bug if no newline?
  ),

  image: str('# Image', '', '![dxos](https://pbs.twimg.com/profile_banners/1268328127673044992/1684766689/1500x500)'),

  headings: str(
    ...[1, 2, 3, 4, 5, 6].map((level) => ['#'.repeat(level) + ` Heading ${level}`, faker.lorem.sentences(), '']).flat(),
  ),

  paragraphs: str(...faker.helpers.multiple(() => [faker.lorem.paragraph(), ''], { count: 3 }).flat()),

  footer: str('', '', '', '', '')
};

const document = str(
  '# Markdown',
  '',
  '> This is a block quote.',
  '',
  'This is all about https://dxos.org and related technologies.',
  '',
  'This this is **bold**, ~~strikethrough~~, _italic_, and `f(INLINE)`.',
  '',
  '---',
  text.links,
  '---',
  text.list,
  '---',
  text.tasks,
  '---',
  text.numbered,
  '---',
  text.code,
  '---',
  text.headings,
  '---',
  text.table,
  '---',
  text.image,
  text.footer,
);

const links = [
  { label: 'DXOS', apply: '[DXOS](https://dxos.org)' },
  { label: 'GitHub', apply: '[DXOS GitHub](https://github.com/dxos)' },
  { label: 'Automerge', apply: '[Automerge](https://automerge.org/)' },
  { label: 'IPFS', apply: '[Protocol Labs](https://docs.ipfs.tech)' },
  { label: 'StackEdit', apply: '[StackEdit](https://stackedit.io/app)' },
];

const names = ['adam', 'alice', 'alison', 'bob', 'carol', 'charlie', 'sayuri', 'shoko'];

const hover =
  'rounded-sm text-base text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const onHoverLinkTooltip: LinkOptions['onHover'] = (el, url) => {
  const web = new URL(url);
  createRoot(el).render(
    <StrictMode>
      <a href={url} target='_blank' rel='noreferrer' className={hover}>
        {web.origin}
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1')} />
      </a>
    </StrictMode>,
  );
};

const Key: FC<{ char: string }> = ({ char }) => (
  <span className='flex justify-center items-center w-[24px] h-[24px] rounded text-xs bg-neutral-200 text-black'>
    {char}
  </span>
);

const onCommentsHover: CommentsOptions['onHover'] = (el, shortcut) => {
  createRoot(el).render(
    <StrictMode>
      <div className='flex items-center gap-2 px-2 py-2 bg-neutral-700 text-white text-xs rounded'>
        <div>Create comment</div>
        <div className='flex gap-1'>
          {keySymbols(parseShortcut(shortcut)).map((char) => (
            <Key key={char} char={char} />
          ))}
        </div>
      </div>
    </StrictMode>,
  );
};

const onRenderLink: LinkOptions['onRender'] = (el, url) => {
  createRoot(el).render(
    <StrictMode>
      <a href={url} target='_blank' rel='noreferrer' className={hover}>
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1 mb-[2px]')} />
      </a>
    </StrictMode>,
  );
};

type StoryProps = {
  text?: string;
  comments?: Comment[];
  automerge?: boolean;
} & Pick<TextEditorProps, 'readonly' | 'placeholder' | 'slots' | 'extensions'>;

const Story = ({ text, comments, automerge, placeholder = 'New document.', ...props }: StoryProps) => {
  const [item] = useState({ text: new TextObject(text, undefined, undefined, { automerge }) });
  const view = useRef<EditorView>(null);
  const model = useTextModel({ text: item.text });
  useComments(view.current, comments);
  if (!model) {
    return null;
  }

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface)}>
      <div className='flex h-full justify-center'>
        <div className='flex flex-col h-full w-[800px]'>
          <MarkdownEditor ref={view} model={model} placeholder={placeholder} {...props} />
        </div>
      </div>
    </div>
  );
};

export default {
  title: 'react-ui-editor/MarkdownEditor',
  component: MarkdownEditor,
  decorators: [withTheme],
  render: Story,
};

const defaults = [
  autocomplete({
    onSearch: (text) => links.filter(({ label }) => label.toLowerCase().includes(text.toLowerCase())),
  }),
  code(),
  hr(),
  image(),
  link({ onRender: onRenderLink, onHover: onHoverLinkTooltip }),
  // mention({
  //   onSearch: (text) => names.filter((name) => name.toLowerCase().startsWith(text.toLowerCase())),
  // }),
  table(),
  tasklist(),
];

export const Default = {
  render: () => <Story text={document} extensions={defaults} />,
};

export const Readonly = {
  render: () => <Story text={document} extensions={defaults} readonly />,
};

export const NoExtensions = {
  render: () => <Story text={document} />,
};

const large = faker.helpers.multiple(() => faker.lorem.paragraph({ min: 8, max: 16 }), { count: 20 }).join('\n\n');

export const Empty = {
  render: () => <Story />,
};

export const Scrolling = {
  render: () => <Story text={str('# Large Document', '', large)} extensions={[]} />,
};

export const Links = {
  render: () => (
    <Story
      text={str(text.links, text.footer)}
      extensions={[link({ onHover: onHoverLinkTooltip, onRender: onRenderLink })]}
    />
  ),
};

export const Code = {
  render: () => <Story text={str(text.code, text.footer)} extensions={[code()]} readonly />,
};

export const Image = {
  render: () => <Story text={str(text.image, text.footer)} readonly extensions={[image()]} />,
};

export const Lists = {
  render: () => (
    <Story text={str(text.tasks, '', text.list, '', text.numbered, text.footer)} extensions={[tasklist()]} />
  ),
};

export const Table = {
  render: () => <Story text={str(text.table, text.footer)} extensions={[table()]} />,
};

// export const Outliner = {
//   render: () => (
//     <Story
//       text={str('# Outliner', '', 'Block', ': this is a block', ': with multiple lines', text.footer)}
//       extensions={[outliner()]}
//     />
//   ),
// };

export const Autocomplete = {
  render: () => (
    <Story
      text={str('# Autocomplete', '', 'Press Ctrl-Space...', text.footer)}
      extensions={[
        link({ onRender: onRenderLink }),
        autocomplete({
          onSearch: (text) => links.filter(({ label }) => label.toLowerCase().includes(text.toLowerCase())),
        }),
      ]}
    />
  ),
};

export const Mention = {
  render: () => (
    <Story
      text={str('# Mention', '', 'Type @...', text.footer)}
      extensions={[
        mention({
          onSearch: (text) => names.filter((name) => name.toLowerCase().startsWith(text.toLowerCase())),
        }),
      ]}
    />
  ),
};

export const Comments = {
  render: () => {
    const [commentRanges, setCommentRanges] = useState<Comment[]>([]);

    return (
      <Story
        text={str('# Comments', '', text.paragraphs, text.footer)}
        comments={commentRanges}
        extensions={[
          comments({
            onHover: onCommentsHover,
            onCreate: (range) => {
              const id = PublicKey.random().toHex();
              setCommentRanges((commentRanges) => [...commentRanges, { id, cursor: range }]);
              return id;
            },
            onSelect: (state) => {
              const debug = false;
              if (debug) {
                console.log(
                  'update',
                  JSON.stringify({
                    comments: state.comments.length,
                    active: state.selection.active?.slice(0, 8),
                    closest: state.selection.closest?.slice(0, 8),
                  }),
                );
              }
            },
          }),
        ]}
      />
    );
  },
};

export const HorizontalRule = {
  render: () => (
    <Story
      text={str('# Horizontal Rule', '', text.paragraphs, '---', text.paragraphs, '---', text.paragraphs)}
      extensions={[hr()]}
    />
  ),
};

const typewriterItems = localStorage.getItem('dxos.org/plugin/markdown/typewriter')?.split(',');

export const Typewriter = {
  render: () => (
    <Story
      text={str('# Typewriter', '', text.paragraphs, text.footer)}
      extensions={[typewriter({ items: typewriterItems })]}
    />
  ),
};

export const Blast = {
  render: () => (
    <Story
      text={str('# Blast', '', text.paragraphs, text.code, text.paragraphs)}
      extensions={[
        typewriter({ items: typewriterItems }),
        blast(
          defaultsDeep(
            {
              effect: 2,
              particleGravity: 0.2,
              particleShrinkRate: 0.995,
              color: () => [faker.number.int({ min: 100, max: 200 }), 0, 0],
              // color: () => [faker.number.int(256), faker.number.int(256), faker.number.int(256)],
            },
            defaultOptions,
          ),
        ),
      ]}
    />
  ),
};
