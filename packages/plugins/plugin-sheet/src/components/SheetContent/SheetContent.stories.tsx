//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { testFunctionPlugins } from '@dxos/compute-hyperformula/testing';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Relation } from '@dxos/echo';
import * as CommentOperation from '@dxos/plugin-review/CommentOperation';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { AnchoredTo, Thread } from '@dxos/types';

import { createTestCells, useTestSheet, withComputeGraphDecorator } from '#testing';
import { translations } from '#translations';
import { Sheet, SheetUtil } from '#types';

import { useComputeGraph } from '../ComputeGraph/index.ts';
import { SheetRoot, useSheetContext } from '../SheetRoot/index.ts';
import { SheetContent } from './SheetContent.tsx';

export const Basic = () => {
  const [space] = useSpaces();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !graph) {
    return null;
  }

  return (
    <SheetRoot graph={graph} sheet={sheet} attendableId='test' ignoreAttention>
      <div className='grid dx-fill'>
        <SheetContent />
      </div>
    </SheetRoot>
  );
};

/** How often the sheet has selected a thread because the user focused its cell. */
let threadSelections = 0;

const meta = {
  title: 'plugins/plugin-sheet/components/SheetContent',
  component: SheetContent,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ types: [Sheet.Sheet, Sheet.Chart, Thread.Thread, AnchoredTo.AnchoredTo], createSpace: true }),
    withComputeGraphDecorator({ plugins: testFunctionPlugins }),
    withPluginManager({
      plugins: [ProcessManagerPlugin.make()],
      capabilities: [
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(
            Operation.withHandler(CommentOperation.Select, () =>
              Effect.sync(() => {
                threadSelections++;
              }),
            ),
            Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void),
          ),
        ),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof SheetContent>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Anchors a thread on B2, and inserts a row above it on request. */
const ThreadProbe = () => {
  const { model } = useSheetContext();
  const [space] = useSpaces();
  useEffect(() => {
    space?.db.add(
      Relation.make(AnchoredTo.AnchoredTo, {
        [Relation.Source]: space.db.add(Thread.make()),
        [Relation.Target]: model.sheet,
        anchor: SheetUtil.anchorFromSelection(model.sheet, { mode: 'range', from: 'B2', to: 'B2' }),
      }),
    );
  }, [space, model.sheet]);

  return (
    <button onPointerDown={(event) => event.preventDefault()} onClick={() => model.insertRows(0)}>
      Insert row at top
    </button>
  );
};

const ThreadStory = () => {
  const [space] = useSpaces();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, { cells: createTestCells() });
  if (!sheet || !graph) {
    return null;
  }

  return (
    <SheetRoot graph={graph} sheet={sheet} attendableId='test' ignoreAttention>
      <ThreadProbe />
      <div className='grid dx-fill'>
        <SheetContent />
      </div>
    </SheetRoot>
  );
};

/**
 * Focusing a commented cell selects its thread; a collaborator moving the cell's row does not select it again.
 */
export const ThreadNotReselectedWhenRowMoves: Story = {
  render: () => <ThreadStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    threadSelections = 0;
    await userEvent.click(await canvas.findByTestId('grid.1.1', undefined, { timeout: 30_000 }));
    await waitFor(() => expect(threadSelections).toBeGreaterThan(0));
    // Outlast the hook's debounce and animation frame.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const selections = threadSelections;

    await userEvent.click(canvas.getByRole('button', { name: 'Insert row at top' }));
    await waitFor(() => expect(document.activeElement).toBe(canvas.getByTestId('grid.1.2')));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(threadSelections).toBe(selections);
  },
};
