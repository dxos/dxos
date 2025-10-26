//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { automerge, translations as editorTranslations } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';

import { translations } from '../../translations';

import { MarkdownEditor, type MarkdownEditorRootProps } from './MarkdownEditor';

const content = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n');

type StoryProps = MarkdownEditorRootProps & {
  content?: string;
};

const DefaultStory = ({ id = 'test', content = '# Test', ...props }: StoryProps) => {
  const doc = useMemo(() => createObject({ content }), [content]);
  const extensions = useMemo(() => [automerge(createDocAccessor(doc, ['content']))], [doc]);

  return (
    <StackItem.Content toolbar>
      <MarkdownEditor.Root id={id} extensions={extensions} {...props}>
        <MarkdownEditor.Toolbar />
        <MarkdownEditor.Main />
      </MarkdownEditor.Root>
    </StackItem.Content>
  );
};

const meta = {
  title: 'plugins/plugin-markdown/MarkdownEditor',
  component: MarkdownEditor as any,
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ container: 'column' }),
    withPluginManager({ plugins: [ClientPlugin({}), IntentPlugin()] }),
    withAttention,
  ],
  parameters: {
    translations: [...translations, ...editorTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content,
  },
};
