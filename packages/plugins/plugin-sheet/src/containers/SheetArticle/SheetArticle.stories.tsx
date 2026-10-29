//
// Copyright 2024 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { ComputeGraphRegistry } from '@dxos/compute-hyperformula';
import { createMockedComputeRuntimeProvider } from '@dxos/compute-hyperformula/testing';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Obj } from '@dxos/echo';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { useComputeGraph } from '#components';
import { createTestCells, useTestSheet, withComputeGraphDecorator } from '#testing';
import { translations } from '#translations';
import { Sheet, SheetCapabilities, SheetOperation } from '#types';

import RangeList from '../RangeList/index.ts';
import { SheetArticle } from './SheetArticle.tsx';

// SheetArticle resolves the registry from its capability, so the context and the capability must
// share one instance.
const registry = new ComputeGraphRegistry({ computeRuntime: createMockedComputeRuntimeProvider() });

const meta = {
  title: 'plugins/plugin-sheet/containers/SheetArticle',
  component: SheetArticle,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ types: [Sheet.Sheet, Sheet.Chart], createSpace: true }),
    withComputeGraphDecorator({ registry }),
    withPluginManager({
      plugins: [...CorePlugins.make()],
      capabilities: [
        Capability.contribute(SheetCapabilities.ComputeGraphRegistry, registry),
        Capability.contribute(
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
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !space) {
    return null;
  }

  return (
    <AttendableContainer id={Obj.getURI(sheet)} classNames='contents'>
      <SheetArticle role={AppSurface.Article.role} subject={sheet} attendableId='test' ignoreAttention />
    </AttendableContainer>
  );
};

export const Spec = () => {
  const [space] = useSpaces();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: { A1: { value: 'Ready' } } });
  if (!sheet || !space) {
    return null;
  }

  return (
    <AttendableContainer id={Obj.getURI(sheet)} classNames='contents'>
      <div className='w-full grid grid-cols-[1fr_20rem]'>
        <SheetArticle role={AppSurface.Article.role} subject={sheet} attendableId='test' ignoreAttention />
        <div data-testid='grid.range-list'>
          <RangeList sheet={sheet} />
        </div>
      </div>
    </AttendableContainer>
  );
};

/** On a slide: the used range only, scaled down to fit its box (never past 1:1), with no status bar. */
export const Slide = {
  render: () => {
    const [space] = useSpaces();
    const graph = useComputeGraph(space);
    const sheet = useTestSheet(space, graph, { cells: createTestCells() });
    if (!sheet || !space) {
      return null;
    }

    return (
      <AttendableContainer id={Obj.getURI(sheet)} classNames='contents'>
        <div className='relative flex' style={{ width: 480, height: 270 }} data-testid='slide'>
          <SheetArticle role={AppSurface.Slide.role} subject={sheet} attendableId='test' ignoreAttention />
        </div>
      </AttendableContainer>
    );
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const slide = await within(canvasElement).findByTestId('slide', undefined, { timeout: 10_000 });
    await waitFor(
      async () => {
        const scale = Number(slide.querySelector('[data-fit-scale]')?.getAttribute('data-fit-scale'));
        await expect(scale).toBeGreaterThan(0);
        await expect(scale).toBeLessThan(1);
      },
      { timeout: 10_000 },
    );
    await expect(slide.querySelector('.dx-toolbar-surface')).toBeNull();
  },
};
