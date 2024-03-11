//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { type FC, useMemo } from 'react';

import { TextObject } from '@dxos/react-client/echo';
import { Tooltip } from '@dxos/react-ui';
import { automerge, useDocAccessor } from '@dxos/react-ui-editor';
import { withTheme } from '@dxos/storybook-utils';

import { EditorMain } from './EditorMain';
import { MainLayout } from './Layout';

const Story: FC<{
  content: string;
  toolbar?: boolean;
}> = ({ content = '# Test', toolbar }) => {
  const { doc, accessor } = useDocAccessor(new TextObject(content));
  const extensions = useMemo(() => [automerge(accessor)], [doc, accessor]);

  return (
    <Tooltip.Provider>
      <MainLayout toolbar={toolbar}>
        <EditorMain id='test' doc={doc} extensions={extensions} toolbar={toolbar} />
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
