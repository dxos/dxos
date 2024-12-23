//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { type AnyIntentChain, type IntentContext, IntentProvider } from '@dxos/app-framework';
import { todo } from '@dxos/debug';
import { useSpace, create } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { SheetContainer } from './SheetContainer';
import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import translations from '../../translations';
import { SheetAction, SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { RangeList } from '../RangeList';

// TODO(thure via wittjosiah):  stories/components should be written such that the dependency on intents is external and provided via callback and then the story can implement it differently.
const storybookIntentValue = create<IntentContext>({
  dispatch: () => todo(),
  dispatchPromise: async (intentChain: AnyIntentChain): Promise<any> => {
    switch (intentChain.first.action) {
      case SheetAction.DropAxis._tag: {
        const { model, axis, axisIndex } = intentChain.first.data as SheetAction.DropAxis['input'];
        model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
      }
    }
  },
  undo: () => todo(),
  undoPromise: () => todo(),
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
        <div role='none' data-testid='grid.range-list'>
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
