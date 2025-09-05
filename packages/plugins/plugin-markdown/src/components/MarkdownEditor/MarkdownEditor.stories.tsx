//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { automerge, translations as editorTranslations } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor';

const content = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n');

type StoryProps = MarkdownEditorProps & {
  content?: string;
  toolbar?: boolean;
};

const DefaultStory = ({ content = '# Test', toolbar }: StoryProps) => {
  const doc = useMemo(() => createObject({ content }), [content]); // TODO(burdon): Remove dependency on createObject.
  const extensions = useMemo(() => [automerge(createDocAccessor(doc, ['content']))], [doc]);
  return <MarkdownEditor id='test' initialValue={doc.content} extensions={extensions} toolbar={toolbar} />;
};

const meta = {
  title: 'plugins/plugin-markdown/MarkdownEditor',
  component: MarkdownEditor as any,
  render: DefaultStory,
  decorators: [
    withPluginManager({ plugins: [IntentPlugin()] }),
    withAttention,
    withTheme,
    withLayout({ fullscreen: true }),
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

export const WithToolbar: Story = {
  args: {
    toolbar: true,
    content,
  },
};
