//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { GridSheet } from './GridSheet';
import { useComputeGraph } from '../../hooks';
import { useTestSheet, withComputeGraphDecorator } from '../../testing';
import { SheetType } from '../../types';

export default {
  title: 'plugin-sheet/GridSheet',
  component: GridSheet,
  decorators: [
    withClientProvider({ types: [SheetType], createSpace: true }),
    withComputeGraphDecorator(),
    withTheme,
    withLayout({ fullscreen: true, tooltips: true }),
  ],
};

export const Basic = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph);
  if (!sheet || !space) {
    return null;
  }

  return <GridSheet graph={graph} sheet={sheet} />;
};
