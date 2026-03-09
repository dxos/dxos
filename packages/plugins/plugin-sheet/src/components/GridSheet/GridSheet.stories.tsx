//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { testFunctionPlugins } from '@dxos/compute/testing';
import { OperationPlugin, RuntimePlugin } from '@dxos/plugin-testing';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import { translations } from '../../translations';
import { Sheet } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { SheetProvider } from '../SheetContext';

import { SheetContent } from './GridSheet';

export const Basic = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !graph) {
    return null;
  }

  return (
    <SheetProvider graph={graph} sheet={sheet} ignoreAttention>
      <div role='none' className='grid h-full w-full'>
        <SheetContent />
      </div>
    </SheetProvider>
  );
};

const meta = {
  title: 'plugins/plugin-sheet/components/SheetContent',
  component: SheetContent,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ types: [Sheet.Sheet], createSpace: true }),
    withComputeGraphDecorator({ plugins: testFunctionPlugins }),
    withPluginManager({
      plugins: [OperationPlugin(), RuntimePlugin()],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof SheetContent>;

export default meta;

type Story = StoryObj<typeof meta>;
