//
// Copyright 2024 DXOS.org
//

import { type Meta } from '@storybook/react';
import React from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { GridSheet } from './GridSheet';
import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import { SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { SheetProvider } from '../SheetContext';

export const Basic = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !graph) {
    return null;
  }

  return (
    <SheetProvider graph={graph} sheet={sheet}>
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
    withLayout({ fullscreen: true, tooltips: true }),
  ],
};

export default meta;
