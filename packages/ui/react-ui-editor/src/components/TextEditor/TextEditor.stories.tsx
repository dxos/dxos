//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import defaultsDeep from 'lodash.defaultsdeep';
import React, { useRef, useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { fixedInsetFlexLayout, groupSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { defaultSlots, TextEditor, type TextEditorProps, type TextEditorRef, type TextEditorSlots } from './TextEditor';
import { textTheme } from './themes';
import { useTextModel } from '../../hooks';

const initialText = [
  '# TextEditor',
  '',
  'This is the basic plain text editor within minimal formatting.',
  'You can add custom styles and create custom extensions.',
  'Or use the MarkdownEditor to edit documents.',
  '',
  'https://dxos.org',
].join('\n');

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
          <TextEditor ref={ref} model={model} {...props} />
          <div className='flex shrink-0 h-[300px]'></div>
        </div>
      </div>
    </div>
  );
};

export default {
  title: 'react-ui-editor/TextEditor',
  component: TextEditor,
  decorators: [withTheme],
  render: Story,
};

export const Default = {
  render: () => (
    <Story
      text={initialText}
      slots={defaultsDeep(
        { editor: { theme: textTheme, placeholder: 'Enter text...' } } satisfies TextEditorSlots,
        defaultSlots,
      )}
    />
  ),
};

export const Automerge = {
  render: () => (
    <Story
      text={initialText}
      slots={defaultsDeep(
        { editor: { theme: textTheme, placeholder: 'Enter text...' } } satisfies TextEditorSlots,
        defaultSlots,
      )}
      automerge
    />
  ),
};
