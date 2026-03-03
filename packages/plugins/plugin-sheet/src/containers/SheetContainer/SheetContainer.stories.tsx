//
// Copyright 2024 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useContext } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
import { OperationResolver } from '@dxos/operation';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { AttendableContainer } from '@dxos/react-ui-attention';

import { ComputeGraphContext, useComputeGraph } from '../../components/ComputeGraph';
import RangeList from '../RangeList';
import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import { translations } from '../../translations';
import { Sheet, SheetOperation } from '../../types';

import { SheetContainer } from './SheetContainer';

const meta = {
  title: 'plugins/plugin-sheet/SheetContainer',
  component: SheetContainer,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ types: [Sheet.Sheet], createSpace: true }),
    withComputeGraphDecorator(),
    withPluginManager({
      plugins: [...corePlugins()],
      capabilities: [
        Capability.contributes(Capabilities.OperationResolver, [
          OperationResolver.make({
            operation: SheetOperation.DropAxis,
            handler: ({ model, axis, axisIndex }) =>
              Effect.sync(() => {
                model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
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
  const { registry } = useContext(ComputeGraphContext) ?? {};
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !space || !registry) {
    return null;
  }

  return (
    <AttendableContainer id={Obj.getDXN(sheet).toString()} classNames='contents'>
      <SheetContainer role='article' space={space} subject={sheet} registry={registry} ignoreAttention />
    </AttendableContainer>
  );
};

export const Spec = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const { registry } = useContext(ComputeGraphContext) ?? {};
  const sheet = useTestSheet(space, graph, { cells: { A1: { value: 'Ready' } } });
  if (!sheet || !space || !registry) {
    return null;
  }

  return (
    <AttendableContainer id={Obj.getDXN(sheet).toString()} classNames='contents'>
      <div role='none' className='w-full grid grid-cols-[1fr_20rem]'>
        <SheetContainer role='article' space={space} subject={sheet} registry={registry} ignoreAttention />
        <div role='none' data-testid='grid.range-list'>
          <RangeList sheet={sheet} />
        </div>
      </div>
    </AttendableContainer>
  );
};
