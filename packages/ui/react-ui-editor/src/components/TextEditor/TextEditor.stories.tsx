//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useMemo, useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { fixedInsetFlexLayout, groupSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { TextEditor, type TextEditorProps } from './TextEditor';
import { listener } from '../../extensions';
import { type EditorModel, useTextModel } from '../../hooks';

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
}: { text?: string; automerge?: boolean } & Pick<TextEditorProps, 'extensions' | 'placeholder' | 'slots'>) => {
  const [item] = useState({ text: new TextObject(text, undefined, undefined, { automerge }) });
  const model = useTextModel({ text: item.text });
  if (!model) {
    return null;
  }

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface)}>
      <div className='flex justify-center'>
        <div className='flex flex-col w-[800px] py-16'>
          <TextEditor model={model} {...props} />
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
  render: () => <Story placeholder='Enter text...' />,
};

export const Text = {
  render: () => <Story text={initialText} placeholder='Enter text...' />,
};

export const Automerge = {
  render: () => <Story text={initialText} placeholder='Enter text...' automerge />,
};

export const Listener = {
  render: () => (
    <Story placeholder='Enter text...' extensions={[listener({ onChange: (text) => console.log(text) })]} />
  ),
};

export const Test = {
  render: () => {
    const model: EditorModel = useMemo(
      () => ({
        id: 'test',
        text: () => 'hello',
        content: 'hello',
      }),
      [],
    );
    return <TextEditor model={model} />;
  },
};
