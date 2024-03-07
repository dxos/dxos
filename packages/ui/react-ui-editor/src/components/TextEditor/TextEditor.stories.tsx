//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { mx, textBlockWidth } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { TextEditor, type TextEditorProps } from './TextEditor';
import { useTextModel } from '../../hooks';
import translations from '../../translations';

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
    <TextEditor
      model={model}
      slots={{
        root: { className: mx(textBlockWidth, 'min-bs-dvh') },
        editor: { className: 'min-bs-dvh p-2 bg-white dark:bg-black' },
      }}
      {...props}
    />
  );
};

export default {
  title: 'react-ui-editor/TextEditor',
  component: TextEditor,
  decorators: [withTheme],
  render: Story,
  parameters: { translations, layout: 'fullscreen' },
};

export const Default = {
  render: () => <Story text={initialText} placeholder='Enter text...' />,
};
