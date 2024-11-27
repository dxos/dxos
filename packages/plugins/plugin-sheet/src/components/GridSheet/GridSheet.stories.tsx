//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { IntentProvider, type Intent } from '@dxos/app-framework';
import { useSpace, create } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { GridSheet } from './GridSheet';
import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import translations from '../../translations';
import { SheetAction, SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { SheetProvider } from '../SheetContext';

// TODO(thure): Should we have a decorator for this?
const storybookIntentValue = create({
  dispatch: async (intents: Intent | Intent[]) => {
    const intent = Array.isArray(intents) ? intents[0] : intents;
    switch (intent.action) {
      case SheetAction.DROP_AXIS: {
        if (!intent.undo) {
          const { model, axis, axisIndex } = intent.data as SheetAction.DropAxis;
          model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
        }
      }
    }
  },
  undo: async () => ({}),
  history: [],
  registerResolver: () => () => {},
});

export const Basic = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !graph) {
    return null;
  }

  return (
    <IntentProvider value={storybookIntentValue}>
      <SheetProvider graph={graph} sheet={sheet} ignoreAttention>
        <GridSheet />
      </SheetProvider>
    </IntentProvider>
  );
};

export const Spec = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: { A1: { value: 'Ready' } } });
  if (!sheet || !graph) {
    return null;
  }

  return (
    <IntentProvider value={storybookIntentValue}>
      <SheetProvider graph={graph} sheet={sheet} ignoreAttention>
        <GridSheet />
      </SheetProvider>
    </IntentProvider>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-sheet/GridSheet',
  component: GridSheet,
  decorators: [
    withClientProvider({ types: [SheetType], createSpace: true }),
    withComputeGraphDecorator(),
    withTheme,
    withLayout({ fullscreen: true, tooltips: true, classNames: 'grid' }),
  ],
  parameters: { translations },
};

export default meta;
