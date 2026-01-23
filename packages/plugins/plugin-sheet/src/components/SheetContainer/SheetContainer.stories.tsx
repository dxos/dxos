//
// Copyright 2024 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
import { OperationResolver } from '@dxos/operation';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';

import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import { translations } from '../../translations';
import { Sheet, SheetOperation } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { RangeList } from '../RangeList';

import { SheetContainer } from './SheetContainer';

const meta = {
  title: 'plugins/plugin-sheet/SheetContainer',
  component: SheetContainer,
  decorators: [
    withTheme,
    withClientProvider({ types: [Sheet.Sheet], createSpace: true }),
    withComputeGraphDecorator(),
    withAttention,
    // TODO(wittjosiah): Consider whether we should refactor component so story doesn't need to depend on intents.
    withPluginManager({
      plugins: [...corePlugins()],
      capabilities: [
        Capability.contributes(Common.Capability.OperationResolver, [
          OperationResolver.make({
            operation: SheetOperation.DropAxis,
            handler: ({ model, axis, axisIndex }) =>
              Effect.sync(() => {
                model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
                // Return stub output for story purposes.
                return { axis, axisIndex, index: 0, axisMeta: null, values: [] };
              }),
          }),
        ]),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof SheetContainer>;

export default meta;

export const Default = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !space) {
    return null;
  }

  return (
    <AttendableContainer id={Obj.getDXN(sheet).toString()} classNames='contents'>
      <SheetContainer space={space} sheet={sheet} role='story' ignoreAttention />
    </AttendableContainer>
  );
};

export const Spec = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, {
    cells: { A1: { value: 'Ready' } },
  });
  if (!sheet || !space) {
    return null;
  }

  return (
    <AttendableContainer id={Obj.getDXN(sheet).toString()} classNames='contents'>
      <div role='none' className='grid grid-rows-[66%_33%] h-[100dvh] grid-cols-1'>
        <SheetContainer space={space} sheet={sheet} role='story' ignoreAttention />
        <div role='none' data-testid='grid.range-list'>
          <RangeList sheet={sheet} />
        </div>
      </div>
    </AttendableContainer>
  );
};
