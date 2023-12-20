//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { EditorView } from '@codemirror/view';
import { faker } from '@faker-js/faker';
import { ArrowSquareOut } from '@phosphor-icons/react';
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
} from './extensions';
import { useTextModel } from '../../hooks';

// TODO(burdon): Read-only render mode (presentation).
// TODO(burdon): Slides.
// TODO(burdon): Autocomplete.
// TODO(burdon): Block quote.
// TODO(burdon): Images.
// TODO(burdon): Tables.

const str = (...lines: string[]) => lines.join('\n');

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
    '  return () => <div>Test</div>;',
    '};',
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

  headings: str(
    ...[1, 2, 3, 4, 5, 6].map((level) => ['#'.repeat(level) + ` Heading ${level}`, faker.lorem.sentences(), '']).flat(),
  ),

  paragraphs: str(...faker.helpers.multiple(() => [faker.lorem.paragraph(), ''], { count: 3 }).flat())
};

const document = str(
  '# Markdown',
  '',
  '> This is a block quote.',
  '',
  'This is all about https://dxos.org and related technologies.',
  '',
  'This this is **bold**, __underlined__, _italic_, and `f(INLINE)`.',
  '',
  '__NOTE__: Fenced code uses the base font.',
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

const Story = ({
  text,
  automerge,
  ...props
}: { text?: string; automerge?: boolean } & Pick<TextEditorProps, 'extensions' | 'slots'>) => {
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

export const Default = {
  render: () => (
    <Story
      text={document}
      extensions={[
        link({ onRender }),
        tooltip({ onHover }),
        tasklist(),
        autocomplete({
          onSearch: (text) => links.filter(({ label }) => label.toLowerCase().includes(text.toLowerCase())),
        }),
      ]}
    />
  ),
};

export const Simple = {
  render: () => <Story text={document} />,
};

export const Tooltips = {
  render: () => <Story text={text.links} extensions={[tooltip({ onHover })]} />,
};

export const Links = {
  render: () => <Story text={text.links} extensions={[link({ onRender })]} />,
};

export const TaskList = {
  render: () => (
    <Story
      text={str(text.tasks, '', text.list)}
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
      text={str('# Autocomplete', '', '', '', '', '', '')}
      extensions={[
        link({ onRender }),
        autocomplete({
          onSearch: (text) => links.filter(({ label }) => label.toLowerCase().includes(text.toLowerCase())),
        }),
      ]}
    />
  ),
};

const mark = () => `[^${PublicKey.random().toHex()}]`;
export const Comments = {
  render: () => (
    <Story
      text={str(mark(), '', text.paragraphs, mark(), '', mark(), '')}
      extensions={[
        comments({
          onCreate: () => PublicKey.random().toHex(),
          onUpdate: (info) => {
            console.log('update', info);
          },
        }),
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
