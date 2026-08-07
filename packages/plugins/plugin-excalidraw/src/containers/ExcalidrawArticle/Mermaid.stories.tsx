//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-client';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type ContentMap, Mermaid } from '@dxos/plugin-illustrator/model';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { applyCommands } from '#model';

import * as Excalidraw from '../../types/Excalidraw';
import { ExcalidrawArticle } from './ExcalidrawArticle';

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
  const [{ drawing, canvas }] = useState(() => {
    const content: ContentMap = {};
    applyCommands(content, Mermaid.compile(FLOWCHART, { scale: 2 }));
    const canvas = createObject(Drawing.makeCanvas({ schema: Excalidraw.EXCALIDRAW_SCHEMA, content }));
    return { drawing: createObject(Drawing.make({ canvas })), canvas };
  });

  return <ExcalidrawArticle role='article' drawing={drawing} canvas={canvas} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-excalidraw/containers/Mermaid',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
