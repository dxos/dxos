//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-client';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type ContentMap, Mermaid } from '@dxos/plugin-illustrator/model';
import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { applyCommands } from '#model';
import { Tldraw } from '#types';

import { CanvasComponent } from './Canvas';

const FLOWCHART = `
flowchart TB
    X[X]

    subgraph CORE[" "]
        A[A]
        B[B]
        C[C]

        A --> B
        A --> C
    end

    Y[Y]

    X --> A
    X --> B
    X --> C
    C --> Y
    Y --> C
`;

const DefaultStory = () => {
  const [canvas] = useState(() => {
    const content: ContentMap = {};
    applyCommands(content, Mermaid.compile(FLOWCHART, { scale: 2 }));
    return createObject(Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA, content }));
  });

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <CanvasComponent classNames='dx-attention-surface' canvas={canvas} assetsBaseUrl={null} autoCenter />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-tldraw/components/Mermaid',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
