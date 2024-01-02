//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { EditorView } from '@codemirror/view';
import { faker } from '@faker-js/faker';
import { ArrowSquareOut } from '@phosphor-icons/react';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { fixedInsetFlexLayout, getSize, groupSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor, type TextEditorProps, type TextEditorRef } from './TextEditor';
import {
  autocomplete,
  listener,
  link,
  tasklist,
  tooltip,
  type TooltipOptions,
  type LinkOptions,
  comments,
  table,
  image,
  mention,
  blast,
  demo,
  defaultOptions,
  highlight,
  code,
} from './extensions';
import { useTextModel } from '../../hooks';

// Extensions:
// TODO(burdon): Table of contents.
// TODO(burdon): Front-matter

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
    '  - [ ] indent',
    '  - [x] style',
  ),

  list: str(
    '## List',
    '',
    '- new york',
    '- london',
    '- tokyo',
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
    '',
    '```'
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
    `| ${faker.lorem.word().padStart(8)} | ${faker.lorem.word().padStart(8)} | ${faker.lorem.word().padStart(8)} |`,
    '|----------|----------|----------|',
    `| ${num().padStart(8)} | ${num().padStart(8)} | ${num().padStart(8)} |`,
    `| ${num().padStart(8)} | ${num().padStart(8)} | ${num().padStart(8)} |`,
    `| ${num().padStart(8)} | ${num().padStart(8)} | ${num().padStart(8)} |`,
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
  '',
  text.footer,
);

const links = [
  { label: 'DXOS', apply: '[DXOS](https://dxos.org)' },
  { label: 'GitHub', apply: '[DXOS GitHub](https://github.com/dxos)' },
  { label: 'Automerge', apply: '[Automerge](https://automerge.org/)' },
  { label: 'IPFS', apply: '[Protocol Labs](https://docs.ipfs.tech)' },
  { label: 'StackEdit', apply: '[StackEdit](https://stackedit.io/app)' },
];

const hover =
  'rounded-sm text-base text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const onHover: TooltipOptions['onHover'] = (el, url) => {
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

const onRender: LinkOptions['onRender'] = (el, url) => {
  createRoot(el).render(
    <StrictMode>
      <a href={url} target='_blank' rel='noreferrer' className={hover}>
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1 mb-1')} />
      </a>
    </StrictMode>,
  );
};

// TODO(burdon): Pass in model.
const Story = ({
  text,
  automerge,
  ...props
}: { text?: string; automerge?: boolean } & Pick<TextEditorProps, 'readonly' | 'extensions' | 'slots'>) => {
  const ref = useRef<TextEditorRef>(null);
  const [item] = useState({ text: new TextObject(text, undefined, undefined, { useAutomergeBackend: automerge }) });
  const model = useTextModel({ text: item.text });
  if (!model) {
    return null;
  }

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface)}>
      <div className='flex justify-center overflow-y-scroll'>
        <div className='flex flex-col w-[800px] py-16'>
          <MarkdownEditor ref={ref} model={model} {...props} />
          <div className='flex shrink-0 h-[300px]'></div>
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

const extensions = [
  autocomplete({
    onSearch: (text) => links.filter(({ label }) => label.toLowerCase().includes(text.toLowerCase())),
  }),
  code(),
  image(),
  link({ onRender }),
  table(),
  tasklist(),
  tooltip({ onHover }),
];

export const Default = {
  render: () => <Story text={document} extensions={extensions} />,
};

export const Readonly = {
  render: () => <Story text={document} extensions={extensions} readonly />,
};

export const Tooltips = {
  render: () => <Story text={str(text.links, text.footer)} extensions={[tooltip({ onHover })]} />,
};

export const Links = {
  render: () => <Story text={str(text.links, text.footer)} extensions={[link({ onRender })]} />,
};

export const Code = {
  render: () => <Story text={str(text.code, text.footer)} extensions={[code()]} readonly />,
};

export const Table = {
  render: () => <Story text={str(text.table, text.footer)} extensions={[table()]} />,
};

export const Image = {
  render: () => <Story text={str(text.image, text.footer)} readonly extensions={[image()]} />,
};

export const TaskList = {
  render: () => (
    <Story
      text={str(text.tasks, '', text.list, text.footer)}
      extensions={[
        tasklist(),
        listener({
          onChange: (text) => {
            console.log(text);
          },
        }),
      ]}
    />
  ),
};

export const Autocomplete = {
  render: () => (
    <Story
      text={str('# Autocomplete', '', 'Press CTRL-SPACE', text.footer)}
      extensions={[
        link({ onRender }),
        autocomplete({
          onSearch: (text) => links.filter(({ label }) => label.toLowerCase().includes(text.toLowerCase())),
        }),
      ]}
    />
  ),
};

const names = ['adam', 'alice', 'alison', 'bob', 'carol', 'charlie', 'sayuri', 'shoko'];

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

const mark = () => `[^${PublicKey.random().toHex()}]`;
export const Comments = {
  render: () => (
    <Story
      text={str(text.paragraphs, mark(), '', mark(), text.footer)}
      extensions={[
        comments({
          onCreate: () => PublicKey.random().toHex(),
          onUpdate: (info) => {
            // console.log('update', info);
          },
        }),
        highlight(),
      ]}
    />
  ),
};

export const Diagnostics = {
  render: () => (
    <Story
      text={document}
      extensions={[
        // Cursor moved.
        EditorView.updateListener.of((update) => {
          console.log('update', update.view.state.selection.main.head);
        }),
      ]}
    />
  ),
};

export const Demo = {
  render: () => <Story text={str(text.paragraphs, text.footer)} extensions={[demo()]} />,
};

export const Blast = {
  render: () => (
    <Story
      text={str(text.paragraphs, text.code, text.paragraphs)}
      extensions={[
        demo({
          items: localStorage.getItem('dxos.composer.extension.demo')?.split(','),
        }),
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

export const NoExtensions = {
  render: () => <Story text={document} />,
};
