//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useRef, useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { code, MarkdownEditor, type TextEditorProps, type TextEditorRef } from '@dxos/react-ui-editor';
import { useTextModel } from '@dxos/react-ui-editor';
import { fixedInsetFlexLayout, groupSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { mermaid } from '../extensions';

const str = (...lines: string[]) => lines.join('\n');

type StoryProps = {
  text?: string;
} & Pick<TextEditorProps, 'readonly' | 'extensions' | 'slots'>;

const Story = ({ text, ...props }: StoryProps) => {
  const ref = useRef<TextEditorRef>(null);
  const [item] = useState({ text: new TextObject(text) });
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
  title: 'plugin-mermaid/extensions',
  component: MarkdownEditor,
  decorators: [withTheme],
  render: Story,
};

export const Mermaid = {
  render: () => (
    <Story
      text={str(
        '# Mermaid',
        '',
        'This is a mermaid diagram:',
        '',
        '```mermaid',
        'graph LR;',
        'A-->B;',
        'B-->C;',
        'B-->D;',
        'B-->E;',
        'D-->E;',
        'C-->D;',
        '```',
        '',
        "It's pretty cool",
        '',
      )}
      extensions={[code(), mermaid()]}
    />
  ),
};

export const Error = {
  render: () => (
    <Story
      text={str(
        '# Mermaid',
        '',
        'This is a broken mermaid diagram:',
        '',
        '```mermaid',
        'graph TD;',
        'A- ->B;',
        '```',
        '',
        '',
        '',
      )}
      extensions={[code(), mermaid()]}
    />
  ),
};
