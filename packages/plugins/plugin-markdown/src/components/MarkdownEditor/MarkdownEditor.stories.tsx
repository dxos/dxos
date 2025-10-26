//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientPlugin } from '@dxos/plugin-client';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { automerge, translations as editorTranslations } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';

import { translations } from '../../translations';

import { MarkdownEditor, type MarkdownEditorRootProps } from './MarkdownEditor';

const content = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n');

type StoryProps = Omit<MarkdownEditorRootProps, 'id'> & {
  content?: string;
};

// TODO(burdon): Test comments.
// TODO(burdon): Test toolbar state.
// TODO(burdon): Test update document name.

const DefaultStory = ({ content = '# Test', ...props }: StoryProps) => {
  const doc = useMemo(() => createObject({ content }), [content]);
  const extensions = useMemo(() => [automerge(createDocAccessor(doc, ['content']))], [doc]);
  const attentionAttrs = useAttentionAttributes(doc.id);

  // TODO(burdon): Toolbar attention isn't working in this story.
  return (
    <div className='contents' {...attentionAttrs}>
      <StackItem.Content toolbar>
        <MarkdownEditor.Root id={doc.id} extensions={extensions} {...props}>
          <MarkdownEditor.Toolbar />
          <MarkdownEditor.Main />
        </MarkdownEditor.Root>
      </StackItem.Content>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-markdown/MarkdownEditor',
  component: MarkdownEditor as any,
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ container: 'column' }),
    withPluginManager({ plugins: [ClientPlugin({}), IntentPlugin(), AttentionPlugin()] }),
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
