//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useMemo, type FC } from 'react';

import { createDocAccessor, createEchoReactiveObject } from '@dxos/echo-schema';
import { Tooltip } from '@dxos/react-ui';
import { automerge } from '@dxos/react-ui-editor';
import { withTheme } from '@dxos/storybook-utils';

import { EditorMain } from './EditorMain';
import { MainLayout } from './Layout';

const Story: FC<{
  content: string;
  toolbar?: boolean;
}> = ({ content = '# Test', toolbar }) => {
  const doc = useMemo(() => createEchoReactiveObject({ content }), [content]);
  const extensions = useMemo(() => [automerge(createDocAccessor(doc, ['content']))], [doc]);

  return (
    <Tooltip.Provider>
      <MainLayout toolbar={toolbar}>
        <EditorMain id='test' doc={doc.content} extensions={extensions} toolbar={toolbar} />
      </MainLayout>
    </Tooltip.Provider>
  );
};

export default {
  title: 'plugin-markdown/EditorMain',
  component: EditorMain,
  decorators: [withTheme],
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
