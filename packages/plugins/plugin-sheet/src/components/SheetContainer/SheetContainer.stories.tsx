//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { type Intent, IntentProvider } from '@dxos/app-framework';
import { useSpace, create } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { SheetContainer } from './SheetContainer';
import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import translations from '../../translations';
import { SheetAction, SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { RangeList } from '../RangeList';

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
  if (!sheet || !space) {
    return null;
  }

  return <SheetContainer space={space} sheet={sheet} role='article' ignoreAttention />;
};

export const Spec = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: { A1: { value: 'Ready' } } });
  if (!sheet || !space) {
    return null;
  }

  return (
    <IntentProvider value={storybookIntentValue}>
      <div role='none' className='grid grid-rows-[66%_33%] grid-cols-1'>
        <SheetContainer space={space} sheet={sheet} role='article' ignoreAttention />
        <div role='none'>
          <RangeList sheet={sheet} />
        </div>
      </div>
    </IntentProvider>
  );
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
      classNames: 'grid',
    }),
  ],
  parameters: { translations },
};

export default meta;
