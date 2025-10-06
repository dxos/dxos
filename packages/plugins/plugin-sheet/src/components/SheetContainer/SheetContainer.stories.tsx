//
// Copyright 2024 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { Capabilities, IntentPlugin, contributes, createResolver } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { GraphPlugin } from '@dxos/plugin-graph';
import { fullyQualifiedId, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';

import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import { translations } from '../../translations';
import { SheetAction, SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { RangeList } from '../RangeList';

import { SheetContainer } from './SheetContainer';

const meta = {
  title: 'plugins/plugin-sheet/SheetContainer',
  component: SheetContainer,
  decorators: [
    withTheme,
    withClientProvider({ types: [SheetType], createSpace: true }),
    withComputeGraphDecorator(),
    withAttention,
    // TODO(wittjosiah): Consider whether we should refactor component so story doesn't need to depend on intents.
    withPluginManager({
      plugins: [IntentPlugin(), GraphPlugin()],
      capabilities: [
        contributes(
          Capabilities.IntentResolver,
          createResolver({
            intent: SheetAction.DropAxis,
            resolve: ({ model, axis, axisIndex }) => {
              model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
            },
          }),
        ),
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
    <AttendableContainer id={fullyQualifiedId(sheet)} classNames='contents'>
      <SheetContainer space={space} sheet={sheet} role='article' ignoreAttention />
    </AttendableContainer>
  );
};

export const Spec = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: { A1: { value: 'Ready' } } });
  if (!sheet || !space) {
    return null;
  }

  return (
    <AttendableContainer id={fullyQualifiedId(sheet)} classNames='contents'>
      <div role='none' className='grid grid-rows-[66%_33%] grid-cols-1'>
        <SheetContainer space={space} sheet={sheet} role='article' ignoreAttention />
        <div role='none' data-testid='grid.range-list'>
          <RangeList sheet={sheet} />
        </div>
      </div>
    </AttendableContainer>
  );
};
