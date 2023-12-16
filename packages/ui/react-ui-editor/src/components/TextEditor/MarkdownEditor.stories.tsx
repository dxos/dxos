//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { TextObject } from '@dxos/echo-schema';
import { fixedInsetFlexLayout, getSize, groupSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor, type TextEditorProps, type TextEditorRef } from './TextEditor';
import { tasklist, createHyperlinkTooltip, hyperlinkDecoration, onChangeExtension } from './extensions';
import { useTextModel } from '../../hooks';

// TODO(burdon): Read-only render mode.
// TODO(burdon): Block quote.
// TODO(burdon): Checkbox list.
// TODO(burdon): Images.
// TODO(burdon): Tables.
// TODO(burdon): Autocomplete.

const str = (lines: string[]) => lines.join('\n');

// prettier-ignore
const tasks = str([
  '## Task list',
  '',
  '- [x] parsing',
  '- [ ] styling',
  '- [ ] rendering',
  '',
]);

const text = str([
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
  'Unordered list:',
  '- new york',
  '- london',
  '- tokyo',
  '',
  tasks,
  '',
  'Numbered list:',
  '1. one',
  '2. two',
  '3. three',
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
  '```',
  '---', // TODO(burdon): Horizontal rule.
  '',
  ...[1, 2, 3, 4, 5, 6].map((level) => ['#'.repeat(level) + ` Heading ${level}`, faker.lorem.sentences(), '']).flat(),
]);

const textWithLinks = str([
  '# Test',
  '',
  'This is all about [DXOS](https://dxos.org); take a look!',
  // 'read more [here](https://docs.dxos.org/guide/getting-started.html).',
  '',
  '',
  '',
  '',
]);

const hyperLinkTooltip = () =>
  createHyperlinkTooltip((el, url) => {
    const web = new URL(url);
    createRoot(el).render(
      <StrictMode>
        <a
          href={url}
          target='_blank'
          rel='noreferrer'
          className={mx(
            'rounded-sm text-base text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200',
          )}
        >
          {web.origin}
          <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1')} />
        </a>
      </StrictMode>,
    );
  });

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
  render: () => <Story text={text} extensions={[hyperlinkDecoration(), tasklist()]} />,
};

export const Simple = {
  render: () => <Story text={text} />,
};

export const Tooltips = {
  render: () => <Story text={textWithLinks} extensions={[hyperLinkTooltip()]} />,
};

export const EditableLinks = {
  render: () => <Story text={textWithLinks} extensions={[hyperlinkDecoration()]} />,
};

export const TaskList = {
  render: () => (
    <Story
      text={tasks}
      extensions={[
        tasklist(),
        onChangeExtension((text) => {
          console.log(text);
        }),
      ]}
    />
  ),
};

// export const Decorators = {
//   render: () => <Story text={textWithLinks} extensions={[hyperlinkWidget]} />,
// };

// export const Autocomplete = {
//   render: () => <Story text={text} extensions={[autocomplete()]} />,
// };

// TODO(burdon): State field: track state of document (e.g., spans).
