//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useMemo, type FC } from 'react';

import { createDocAccessor, createEchoObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { editorWithToolbarLayout, automerge } from '@dxos/react-ui-editor';
import { topbarBlockPaddingStart } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor } from './MarkdownEditor';

const Story: FC<{
  content: string;
  toolbar?: boolean;
}> = ({ content = '# Test', toolbar }) => {
  const doc = useMemo(() => createEchoObject({ content }), [content]);
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

export default {
  title: 'plugin-markdown/EditorMain',
  component: MarkdownEditor,
  decorators: [withTheme, withLayout({ tooltips: true })],
  render: Story,
  parameters: { layout: 'fullscreen' },
};

const content = Array.from({ length: 100 })
  .map((_, i) => `Line ${i + 1}`)
  .join('\n');

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
