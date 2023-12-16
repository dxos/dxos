//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import {
  autocompletion,
  type CompletionContext,
  completionKeymap,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';
import { faker } from '@faker-js/faker';
import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { TextObject } from '@dxos/echo-schema';
import { fixedInsetFlexLayout, getSize, groupSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor, type TextEditorProps, type TextEditorRef } from './TextEditor';
import { createHyperlinkTooltip, hyperlinkDecoration } from './extensions';
import { useTextModel } from '../../hooks';

const initialText = [
  '# Markdown',
  '',
  '> Style', // TODO(burdon): Not processed.
  '',
  'This is all about https://dxos.org and related technologies.',
  '',
  'This this is **bold**, __underlined__, _italic_, and `f(INLINE)`.',
  '',
  '__NOTE__: Fenced code uses the base font.',
  '',
  // TODO(burdon): Not processed via GFM lezer?
  'Unordered list:',
  '- a',
  '- b',
  '- c',
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
  '',
  '---', // TODO(burdon): Horizontal rule.
  '',
  ...[1, 2, 3, 4, 5, 6].map((level) => ['#'.repeat(level) + ` Heading ${level}`, faker.lorem.sentences(), '']).flat(),
].join('\n');

const textWithLinks = [
  '# Test',
  '',
  'This is all about [DXOS](https://dxos.org); read more [here](https://docs.dxos.org/guide/getting-started.html).',
  '',
  '',
  '',
  '',
].join('\n');

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
  render: () => <Story text={initialText} />,
};

export const Tooltips = {
  render: () => <Story text={textWithLinks} extensions={[hyperLinkTooltip()]} />,
};

export const EditableLinks = {
  render: () => <Story text={textWithLinks} extensions={[hyperlinkDecoration()]} />,
};

// TODO(burdon): Automcomplete: https://codemirror.net/5/doc/manual.html#addon_runmode
// TODO(burdon): Modes: parallel parsing and decoration (e.g., associated with language).
// TODO(burdon): Add-on: runmode: run lexer over content (with rendering codemirror).
//  https://codemirror.net/5/doc/manual.html#addon_runmode
// TODO(burdon): Add-on: dialog.
// TODO(burdon): Comments: https://codemirror.net/5/doc/manual.html#setBookmark

// TODO(burdon): Split view: https://codemirror.net/examples/split

// https://codemirror.net/examples/autocompletion
// https://codemirror.net/docs/ref/#autocomplete.autocompletion
// https://codemirror.net/docs/ref/#autocomplete.Completion

// TODO(burdon): Hint to customize?
// https://codemirror.net/examples/autocompletion
export const Autocomplete = {
  render: () => {
    return (
      <Story
        text={initialText}
        extensions={[
          keymap.of(completionKeymap),
          autocompletion({
            // addToOptions: [
            //   {
            //     render: (completion) => {
            //       const el = document.createElement('div');
            //       el.innerText = 'info';
            //       return el;
            //     },
            //     position: 0,
            //   },
            // ],
            override: [
              (context: CompletionContext): CompletionResult | null => {
                const word = context.matchBefore(/\w*/);
                if (!word || (word.from === word.to && !context.explicit)) {
                  return null;
                }

                return {
                  from: word.from,
                  options: [
                    { label: 'apple', type: 'keyword' },
                    { label: 'amazon', type: 'keyword' },
                    { label: 'hello', type: 'variable', info: '(World)' },
                    { label: 'magic', type: 'text', apply: '⠁⭒*.✩.*⭒⠁', detail: 'macro' },
                  ],
                };
              },
            ],
          }),
        ]}
      />
    );
  },
};
