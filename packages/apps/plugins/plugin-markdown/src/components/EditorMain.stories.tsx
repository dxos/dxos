//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { type FC } from 'react';

import { TextObject } from '@dxos/react-client/echo';
import { Tooltip } from '@dxos/react-ui';
import { useTextModel } from '@dxos/react-ui-editor';
import { withTheme } from '@dxos/storybook-utils';

import { EditorMain } from './EditorMain';
import { MainLayout } from './Layout';

const Story: FC<{
  content: string;
  toolbar?: boolean;
}> = ({ content = '# Test', toolbar }) => {
  const model = useTextModel({ text: new TextObject(content) });
  if (!model) {
    return null;
  }

  return (
    <Tooltip.Provider>
      <MainLayout>
        <EditorMain model={model} toolbar={toolbar} />
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
