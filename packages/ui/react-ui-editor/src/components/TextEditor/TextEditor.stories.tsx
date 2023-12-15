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
import { markdown } from '@codemirror/lang-markdown';
import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { TextObject } from '@dxos/echo-schema';
import { fixedInsetFlexLayout, getSize, groupSurface, inputSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { TextEditor, type TextEditorRef } from './TextEditor';
import { createHyperlinkTooltip, hyperlinkDecoration } from './extensions';
import { useTextModel } from '../../hooks';

const text = [
  '',
  '',
  'This is all about [DXOS](https://dxos.org); read more [here](https://docs.dxos.org/guide/getting-started.html).',
  '',
  '',
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

const Story = ({ extensions, automerge }: { extensions: Extension[]; automerge?: boolean }) => {
  const ref = useRef<TextEditorRef>(null);
  const [item] = useState({ text: new TextObject(text, undefined, undefined, { useAutomergeBackend: automerge }) });
  const model = useTextModel({ text: item.text });
  if (!model) {
    return null;
  }

  // TODO(burdon): Custom event handler.
  const custom = EditorView.domEventHandlers({
    mousedown: (e, view) => {},
  });

  useEffect(() => {}, [ref]);

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface)}>
      <div className='flex justify-center p-8'>
        <div className='w-[800px]'>
          <TextEditor
            ref={ref}
            model={model}
            extensions={[...extensions, custom]}
            slots={{ root: { className: mx(inputSurface, 'p-2') } }}
          />
        </div>
      </div>
    </div>
  );
};

export default {
  component: TextEditor,
  decorators: [withTheme],
  render: Story,
};

export const Default = {
  render: () => <Story extensions={[markdown(), hyperlinkDecoration({ link: false }), hyperLinkTooltip()]} />,
};

export const Automerge = {
  render: () => <Story automerge extensions={[markdown(), hyperlinkDecoration({ link: false }), hyperLinkTooltip()]} />,
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
