//
// Copyright 2024 DXOS.org
//

import { type Meta } from '@storybook/react';
import React from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { SheetContainer } from './SheetContainer';
import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import { SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';

export const Basic = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !graph) {
    return null;
  }

  return <SheetContainer graph={graph} sheet={sheet} role='article' />;
};

const meta: Meta = {
  title: 'plugins/plugin-sheet/SheetContainer',
  component: SheetContainer,
  decorators: [
    withClientProvider({ types: [SheetType], createSpace: true }),
    withComputeGraphDecorator(),
    withTheme,
    withLayout({
      fullscreen: true,
      tooltips: true,
      classNames: 'grid grid-cols-1 grid-rows-[min-content_minmax(0,1fr)_min-content]',
    }),
  ],
};

export default meta;
