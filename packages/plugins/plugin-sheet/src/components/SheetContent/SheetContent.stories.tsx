//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { testFunctionPlugins } from '@dxos/compute/testing';
import { OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import { translations } from '../../translations';
import { Sheet } from '#types';
import { useComputeGraph } from '../ComputeGraph';
import { SheetRoot } from '../SheetRoot';

import { SheetContent } from './SheetContent';

export const Basic = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !graph) {
    return null;
  }

  return (
    <SheetRoot graph={graph} sheet={sheet} attendableId='test' ignoreAttention>
      <div role='none' className='grid h-full w-full'>
        <SheetContent />
      </div>
    </SheetRoot>
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
