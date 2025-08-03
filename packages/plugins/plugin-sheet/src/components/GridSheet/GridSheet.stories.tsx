//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import { translations } from '../../translations';
import { SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { SheetProvider } from '../SheetContext';

import { GridSheet } from './GridSheet';

export const Basic = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !graph) {
    return null;
  }

  return (
    <SheetProvider graph={graph} sheet={sheet} ignoreAttention>
      <GridSheet />
    </SheetProvider>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-sheet/GridSheet',
  component: GridSheet,
  decorators: [
    withClientProvider({ types: [SheetType], createSpace: true }),
    withComputeGraphDecorator(),
    withTheme,
    withLayout({ fullscreen: true, classNames: 'grid' }),
    withPluginManager({
      plugins: [IntentPlugin()],
    }),
  ],
  parameters: { translations },
};

export default meta;
