//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { HighlightStyle, StreamLanguage } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { ArrowCircleUp } from '@phosphor-icons/react';
import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { TextObject } from '@dxos/echo-schema';
import { fixedInsetFlexLayout, getSize, groupSurface, inputSurface, mx } from '@dxos/react-ui-theme';

import { TextEditor } from './TextEditor';
import { createHyperlinkTooltip, hyperlink } from './extensions';
import { useTextModel } from '../../model';

export const nameRegex = /\{([\w_]+)}/;

/**
 * Simple Monaco language extension.
 * https://github.com/codemirror/stream-parser/blob/main/test/test-stream-parser.ts
 */
export const promptLanguage = StreamLanguage.define<{ count: number }>({
  startState: () => ({ count: 0 }),

  token: (stream, state) => {
    state.count++;
    if (stream.eatSpace()) {
      return null;
    }
    if (stream.match(/^(<\w+>)/)) {
      return 'tagName';
    }
    stream.next();
    return null;
  },
});

/**
 * https://codemirror.net/examples/styling
 * https://lezer.codemirror.net/docs/ref/#highlight
 */
export const promptHighlightStyles = HighlightStyle.define([
  {
    tag: tags.tagName,
    class: mx(
      'mr-1 p-1',
      'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white font-mono text-sm',
      'rounded border border-neutral-300 dark:border-neutral-700',
    ),
  },
]);

const Story = () => {
  const [item] = useState({
    text: new TextObject(
      '\n\n\nThis is all about [DXOS](https://dxos.org); read more [here](https://blog.dxos.org).\n\n\n',
    ),
  });

  const model = useTextModel({ text: item.text });

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface, 'p-4 gap-4')}>
      <TextEditor
        model={model}
        slots={{ root: { className: mx(inputSurface, 'p-2') } }}
        extensions={[
          hyperlink,
          createHyperlinkTooltip((el, url) => {
            createRoot(el).render(
              <StrictMode>
                <div className='flex gap-1 items-center'>
                  <ArrowCircleUp className={mx(getSize(6), 'text-blue-500')} />
                  <p className='pr-1'>{url}</p>
                </div>
              </StrictMode>,
            );
          }),
        ]}
      />
      <pre>{JSON.stringify(model?.content?.toString(), null, 2)}</pre>
    </div>
  );
};

export default {
  component: TextEditor,
  render: Story,
};

export const Default = {};
