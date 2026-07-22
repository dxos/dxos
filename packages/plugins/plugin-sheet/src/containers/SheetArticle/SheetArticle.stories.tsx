//
// Copyright 2024 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useContext } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ComputeGraphContext, useComputeGraph } from '#components';
import { createTestCells, useTestSheet, withComputeGraphDecorator } from '#testing';
import { translations } from '#translations';
import { SheetOperation } from '#types';
import { Sheet } from '#types';

import RangeList from '../RangeList';
import { SheetArticle } from './SheetArticle';

const meta = {
  title: 'plugins/plugin-sheet/containers/SheetArticle',
  component: SheetArticle,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ types: [Sheet.Sheet], createSpace: true }),
    withComputeGraphDecorator(),
    withPluginManager({
      plugins: [...corePlugins()],
      capabilities: [
        Capability.provide(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(
            Operation.withHandler(SheetOperation.DropAxis, ({ model, axis, axisIndex }) =>
              Effect.sync(() => {
                model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
                return { axis, axisIndex, index: 0, axisMeta: null, values: [] };
              }),
            ),
          ),
        ),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof SheetArticle>;

export default meta;

export const Default = () => {
  const [space] = useSpaces();
  const graph = useComputeGraph(space);
  const { registry } = useContext(ComputeGraphContext) ?? {};
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !space || !registry) {
    return null;
  }

  return (
    <AttendableContainer id={Obj.getURI(sheet)} classNames='contents'>
      <SheetArticle
        role='article'
        space={space}
        subject={sheet}
        attendableId='test'
        registry={registry}
        ignoreAttention
      />
    </AttendableContainer>
  );
};

export const Spec = () => {
  const [space] = useSpaces();
  const graph = useComputeGraph(space);
  const { registry } = useContext(ComputeGraphContext) ?? {};
  const sheet = useTestSheet(space, graph, { cells: { A1: { value: 'Ready' } } });
  if (!sheet || !space || !registry) {
    return null;
  }

  return (
    <AttendableContainer id={Obj.getURI(sheet)} classNames='contents'>
      <div className='w-full grid grid-cols-[1fr_20rem]'>
        <SheetArticle
          role='article'
          space={space}
          subject={sheet}
          attendableId='test'
          registry={registry}
          ignoreAttention
        />
        <div data-testid='grid.range-list'>
          <RangeList sheet={sheet} />
        </div>
      </div>
    </AttendableContainer>
  );
};
