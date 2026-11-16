//
// Copyright 2026 DXOS.org
//

//
// Parametric shapes. Each is drawn by a recipe from its frame and a few parameters, and each parameter says what it
// is measured against, so a part keeps its proportions when the frame is resized: an arrow's head is as long as a
// share of the arrow's height, so widening the arrow lengthens only its shaft.
//
// 1. Select a shape: beside its resize handles it shows a dot for each part that can be adjusted.
// 2. Drag an arrow's dots: the one at the head's back corner sets the head's length, the one below it the shaft.
// 3. Widen the arrow by a resize handle: the head keeps its shape. Make it taller: the head grows with it.
// 4. Properties lists the shape's parameters, and Shape there turns it into another recipe.
// 5. Hover the Arrow tool in the palette: every recipe is in its flyout, and a drag on the canvas draws one.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, fireEvent, waitFor, within } from 'storybook/test';

import { type RenderList2D, SHAPE_RECIPES, fromRenderLists2D } from '@dxos/react-ui-canvas';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Scene, type ShapeNode } from '@dxos/scene';

import { FullEditor, SceneEditorStory } from '../../testing/index.ts';

const COLUMNS = 3;
const CELL = { width: 288, height: 192 };

/** One of each recipe, at the size its tool makes it, in a grid about the origin. */
const board = (): RenderList2D => {
  const rows = Math.ceil(SHAPE_RECIPES.length / COLUMNS);
  const nodes: ShapeNode[] = SHAPE_RECIPES.map((recipe, index) => ({
    type: 'shape',
    id: recipe.id,
    z: `a${index}`,
    center: {
      x: ((index % COLUMNS) - (COLUMNS - 1) / 2) * CELL.width,
      y: (Math.floor(index / COLUMNS) - (rows - 1) / 2) * CELL.height,
    },
    size: { width: recipe.defaultSize.width * 48, height: recipe.defaultSize.height * 48 },
    recipe: recipe.id,
    label: recipe.name,
    style: { hue: index % 2 === 0 ? 'indigo' : 'teal' },
  }));
  return {
    id: 'board',
    name: 'Shapes',
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    links: {},
  };
};

type StoryArgs = {
  /** The shape selected as the editor opens, so its adjust handles show. */
  select?: string;
};

const DefaultStory = ({ select }: StoryArgs) => {
  const document = useMemo<Scene.SceneDocument>(() => fromRenderLists2D([board()], { root: 'board' }), []);
  return (
    <SceneEditorStory document={document} docked select={select ? [select] : undefined}>
      <FullEditor dim='2d' />
    </SceneEditorStory>
  );
};

const meta = {
  title: 'ui/react-ui-canvas-editor/components/Shapes',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every recipe, none selected. */
export const Default: Story = {};

/** The arrow selected, with its two adjust handles. */
export const Arrow: Story = {
  args: { select: 'arrow' },
};

/**
 * An adjust handle sets its parameter, and the part it stands for keeps what the parameter is measured against.
 */
export const Test: Story = {
  args: { select: 'arrow' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    const handle = (param: string) => view.querySelector(`[data-testid="shape-handle"][data-param="${param}"]`);
    const centreOf = (element: Element) => {
      const { left, top, width, height } = element.getBoundingClientRect();
      return { clientX: left + width / 2, clientY: top + height / 2 };
    };

    // 1. Every recipe's shape is drawn, and the selected arrow shows a handle for its head and one for its shaft.
    for (const { id } of SHAPE_RECIPES) {
      await waitFor(() => expect(view.querySelector(`[data-node-id="${id}"]`)).not.toBeNull());
    }
    await waitFor(() => expect(view.querySelectorAll('[data-testid="shape-handle"]')).toHaveLength(2));

    // The view fits its scene after it mounts, and a press aimed while it does lands somewhere else.
    let placed = '';
    await waitFor(() => {
      const head = handle('head');
      const now = head ? JSON.stringify(centreOf(head)) : '';
      const still = now !== '' && now === placed;
      placed = now;
      return expect(still).toBe(true);
    });

    // 2. The head's handle, dragged back along the arrow, lengthens the head; the shaft's handle goes with it.
    const head = handle('head');
    const shaft = handle('shaft');
    if (!head || !shaft) {
      throw new Error("The arrow's handles are not drawn.");
    }
    const from = centreOf(head);
    const node = view.querySelector('[data-node-id="arrow"]');
    const frame = node?.getBoundingClientRect();
    const to = { clientX: from.clientX - (frame?.width ?? 0) / 4, clientY: from.clientY };
    await fireEvent.pointerDown(head, { ...from, button: 0, pointerId: 1 });
    await fireEvent.pointerMove(view, { ...to, buttons: 1, pointerId: 1 });
    await fireEvent.pointerUp(view, { ...to, button: 0, pointerId: 1 });
    await waitFor(() => {
      const moved = handle('head');
      return expect(moved ? centreOf(moved).clientX : from.clientX).toBeLessThan(from.clientX - 4);
    });
    const after = handle('shaft');
    await expect(after && Math.abs(centreOf(after).clientX - centreOf(handle('head') ?? after).clientX)).toBeLessThan(
      1,
    );
    // The frame is as it was: the drag set a parameter, not the size.
    await expect(view.querySelector('[data-node-id="arrow"]')?.getBoundingClientRect().width).toBeCloseTo(
      frame?.width ?? 0,
      0,
    );

    // 3. The recipes share one flyout in the tools panel, which stands as the arrow until another is picked.
    const fold = await canvas.findByTestId('palette-group-Shape');
    await expect(within(fold).getByTestId('canvas.tool.node:arrow')).toBeInTheDocument();
  },
};
