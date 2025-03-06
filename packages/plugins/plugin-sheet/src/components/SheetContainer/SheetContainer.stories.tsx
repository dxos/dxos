//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { Capabilities, contributes, createResolver, IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { fullyQualifiedId, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { SheetContainer } from './SheetContainer';
import { createTestCells, useTestSheet, withComputeGraphDecorator } from '../../testing';
import translations from '../../translations';
import { SheetAction, SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { RangeList } from '../RangeList';

export const Basic = () => {
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
    withAttention,
    // TODO(wittjosiah): Consider whether we should refactor component so story doesn't need to depend on intents.
    withPluginManager({
      plugins: [IntentPlugin()],
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
  parameters: { translations },
};

export default meta;
