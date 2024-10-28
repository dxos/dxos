//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useMemo } from 'react';

import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { editorWithToolbarLayout, automerge } from '@dxos/react-ui-editor';
import { topbarBlockPaddingStart } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor';

const content = Array.from({ length: 100 })
  .map((_, i) => `Line ${i + 1}`)
  .join('\n');

type StoryProps = MarkdownEditorProps & {
  content?: string;
  toolbar?: boolean;
};

const DefaultStory = ({ content = '# Test', toolbar }: StoryProps) => {
  const doc = useMemo(() => createObject({ content }), [content]);
  const extensions = useMemo(() => [automerge(createDocAccessor(doc, ['content']))], [doc]);

  return (
    <Main.Content
      bounce
      data-toolbar={toolbar ? 'enabled' : 'disabled'}
      classNames={[topbarBlockPaddingStart, editorWithToolbarLayout]}
    >
      <MarkdownEditor id='test' initialValue={doc.content} extensions={extensions} toolbar={toolbar} />
    </Main.Content>
  );
};

export const Default = {
  args: {
    content,
  },
};

export const WithToolbar = {
  args: {
    content,
    toolbar: true,
  },
};

const meta: Meta<typeof MarkdownEditor> = {
  title: 'plugins/plugin-markdown/EditorMain',
  component: MarkdownEditor,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: { layout: 'fullscreen' },
};

export default meta;
