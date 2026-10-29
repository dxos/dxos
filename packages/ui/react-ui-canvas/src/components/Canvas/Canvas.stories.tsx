//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect, fireEvent, screen, userEvent, waitFor, within } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { type ViewTree } from '../../builder/index.ts';
import { type InspectorMode, createLatticeProjection } from '../../engine/index.ts';
import { type BackgroundGrid, createMemoryStore } from '../../model/index.ts';
import {
  createLatticeTree,
  createLinkedPairTree,
  createModelViewTree,
  createNestedDeepTree,
  createNestedSimpleTree,
  createNestedViewTree,
  createSquareTree,
  createViewTree,
} from '../../testing/index.ts';
import { Canvas } from './Canvas.tsx';

/**
 * Test:
 * 1. Pinch or ctrl/cmd+wheel zooms about the cursor, as does a mouse wheel; a trackpad swipe or hand-tool drag pans; drag on empty canvas draws a marquee.
 * 2. Click selects, shift-click toggles; drag moves the selection (snapped); handles resize a single node.
 *    Hovering a node shows its ports; drag from a port onto a node or port links (a smart line, or the last link type
 *    picked).
 * 3. O / L / K / P pick the smart line, line, curve or spline link tool: every port shows; dropping onto empty canvas creates a
 *    rectangle and links to it. A selected spline shows a diamond per control point and a dot per span midpoint:
 *    drag a diamond to move a point, drag a dot to add one there, alt-click a diamond to remove one.
 * 4. R / E / T / F then drag draws a rectangle, ellipse, text or frame (the UML class is plugin-uml's);
 *    Delete removes the selection (nodes or links).
 * 5. Double-click a frame (or zoom until it fills the view) drills in; Escape, Up or the breadcrumb drills out.
 * 6. G (or the Grid button) toggles the grid; with it off nothing snaps. The floating inspector (top right) edits the
 *    selected element.
 * 7. Double-click (or Enter on) a shape to edit it: a box's label in place, a polyline's vertices as diamonds to drag
 *    (a dot adds one, Backspace removes the last pressed). Enter, Escape or a press outside leaves edit mode.
 */
/** The drawings a story opens, by name; only `elements` grows with `depth` (the others are fixed). */
const FIXTURES = {
  elements: (depth: number) => createViewTree(depth),
  model: () => createModelViewTree(),
  basic: () => createSquareTree(),
  lattice: () => createLatticeTree(),
  deep: () => createNestedDeepTree(),
  view: () => createNestedViewTree(),
  nested: () => createNestedSimpleTree(),
  pair: () => createLinkedPairTree(),
} satisfies Record<string, (depth: number) => ViewTree>;

type Fixture = keyof typeof FIXTURES;

type StoryArgs = {
  depth: number;
  liveDepth: number;
  readonly?: boolean;
  fixture?: Fixture;
  inspectors?: InspectorMode;
};

type EditorProps = {
  store: ReturnType<typeof createMemoryStore>;
  root: string;
  liveDepth: number;
  readonly?: boolean;
  lattice?: boolean;
  inspectors?: InspectorMode;
};

const Editor = ({
  store,
  root,
  liveDepth,
  readonly: initialReadonly = false,
  lattice,
  inspectors: initialInspectors = 'floating',
}: EditorProps) => {
  // The args are where the view starts; the palette's toggle and the inspectors' menus change it from there.
  const [readonly, setReadonly] = useState(initialReadonly);
  const [inspectors, setInspectors] = useState(initialInspectors);
  const [theme, setTheme] = useState<string>();
  const [backgroundGrid, setBackgroundGrid] = useState<BackgroundGrid>();
  return (
    <Canvas.Root
      store={store}
      root={root}
      readonly={readonly}
      onReadonlyChange={setReadonly}
      inspectors={inspectors}
      onInspectorsChange={setInspectors}
      theme={theme}
      onThemeChange={setTheme}
      backgroundGrid={backgroundGrid}
      onBackgroundGridChange={setBackgroundGrid}
      createProjection={lattice ? createLatticeProjection : undefined}
    >
      <Canvas.Viewport liveDepth={liveDepth} />
      <Canvas.Navigation />
      <Canvas.Actions />
      <Canvas.Camera />
      <Canvas.Theme />
      <Canvas.Tools />
      <Canvas.Properties />
      <Canvas.Views />
      <Canvas.Layers />
      <Canvas.Objects />
    </Canvas.Root>
  );
};

const DefaultStory = ({ depth, liveDepth, readonly, fixture = 'elements', inspectors }: StoryArgs) => {
  const { store, root } = useMemo(() => {
    const tree = FIXTURES[fixture](depth);
    return { store: createMemoryStore(tree.views, {}, { root: tree.root }), root: tree.root };
  }, [depth, fixture]);

  // Keyed on the root so a new tree remounts the editor, whose atoms are created on mount.
  return (
    <Editor
      key={root}
      store={store}
      root={root}
      liveDepth={liveDepth}
      readonly={readonly}
      lattice={fixture === 'lattice'}
      inspectors={inspectors}
    />
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/components/Canvas',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  // The properties panel is a react-ui-form form; its strings (e.g. "Mixed") and its controls' come from their bundles.
  parameters: { translations: [...uiTranslations, ...formTranslations] },
  argTypes: {
    inspectors: {
      control: { type: 'inline-radio' },
      options: ['docked', 'floating'],
      description: 'Where the inspectors (properties, layers, about) sit',
    },
    depth: {
      control: { type: 'range', min: 0, max: 5, step: 1 },
      description: 'Levels of nested views in the fixture; 0 is an empty view',
    },
    liveDepth: {
      control: { type: 'range', min: 0, max: 4, step: 1 },
      description: 'Nested levels rendered live below the root; deeper portals are previews',
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** A square at the origin between a circle and a polygon: select one to style it, or draw more nodes and link them. */
export const Default: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'basic' },
};

/** The same scene to look at: select, pan, zoom and drill, but no handle, port, tool or key changes it. */
export const Readonly: Story = {
  args: { depth: 1, liveDepth: 1, readonly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. Read-only, the palette offers only select and pan, and there is no action bar.
    const toggle = await canvas.findByTestId('palette-readonly');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.queryByTestId('canvas-actions')).toBeNull();

    // 2. The toggle turns editing on: the action bar appears.
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(await canvas.findByTestId('canvas-actions')).toBeVisible();

    // 3. And back to read-only.
    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.queryByTestId('canvas-actions')).toBeNull());
  },
};

/** A view nested in the root: drill into C and back out; `liveDepth` sets how many levels render live. */
export const NestedSimple: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'nested' },
};

/**
 * Lattice mode (DESIGN §8b): shapes snap to whole cells of a 256x128 lattice with 128x64 gutters, span any number
 * of cells, and may not overlap; a drag onto occupied cells previews in red and is refused.
 */
/** A, an empty view B and C in a column: open B, draw in it, and compare sizes at 100% on both levels. */
export const NestedDeep: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'deep' },
};

/** A three-level model, a box per class: drill into a subsystem's portal to open its own. */
export const Model: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'model' },
};

export const Lattice: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'lattice' },
};

/**
 * Docked inspectors: one accordion section each beside the canvas, only the properties open to start; a header opens
 * or closes its section, and the dock's close button floats the same column over the canvas.
 */
export const Docked: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'basic', inspectors: 'docked' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. With nothing selected the dock keeps its properties section, saying so; the layers section starts closed, and
    //    its header opens it.
    const dock = await canvas.findByTestId('scene-view-dock');
    await waitFor(() =>
      expect(within(dock).getByTestId('dock-section-layers')).toHaveAttribute('data-state', 'closed'),
    );
    await expect(await within(dock).findByTestId('properties-empty')).toBeVisible();
    await userEvent.click(
      within(within(dock).getByTestId('dock-section-layers')).getByRole('button', { name: 'Layers' }),
    );
    await waitFor(() => expect(within(dock).getByTestId('dock-section-layers')).toHaveAttribute('data-state', 'open'));
    // 2. Closing the dock floats the inspectors in the same column: the layers over the canvas while nothing is selected.
    await userEvent.click(within(dock).getByTestId('dock-close'));
    await waitFor(() => expect(canvas.getByTestId('scene-view-dock')).toHaveAttribute('data-floating'));
    await expect(within(canvas.getByTestId('scene-view-dock')).getByTestId('layers')).toBeVisible();
  },
};

/** Floating inspectors (the default): the panel over the canvas, with the same sections as docked; its toolbar docks them. */
export const Floating: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'basic', inspectors: 'floating' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('layers')).toBeInTheDocument();
    await expect(canvas.getByTestId('scene-view-dock')).toHaveAttribute('data-floating');
    // Floating, the panel holds the same sections it does docked.
    await expect(await canvas.findByTestId('dock-section-views')).toBeInTheDocument();
    await expect(
      [...canvasElement.querySelectorAll('[data-testid^="dock-section-"]')].map((section) =>
        section.getAttribute('data-testid'),
      ),
    ).toEqual(['dock-section-views', 'dock-section-objects', 'dock-section-layers']);
    // A switch at the foot of the properties takes focus without scrolling the panel itself (only its viewport scrolls).
    const node = canvasElement.querySelector<HTMLElement>('[data-testid="scene-view"] [data-node-id]');
    node && (await userEvent.click(node));
    // Floating, every section is in one scrolling list: no seam, the properties first.
    await expect(await canvas.findByTestId('dock-section-properties')).toBeInTheDocument();
    await expect(canvas.queryByTestId('dock-splitter')).toBeNull();
    const guide = await within(await canvas.findByTestId('properties')).findByText('Guide');
    guide.scrollIntoView();
    await userEvent.click(guide);
    await expect(canvas.getByTestId('scene-view-dock').scrollTop).toBe(0);
    // The inspector panel's own toolbar docks the inspectors.
    await userEvent.click(canvas.getByTestId('dock-open'));
    await waitFor(() => expect(canvas.getByTestId('scene-view-dock')).not.toHaveAttribute('data-floating'));
    // Docked, the same sections: layers still closed until opened (only the properties start open).
    await expect(await canvas.findByTestId('dock-section-layers')).toHaveAttribute('data-state', 'closed');
    await expect(canvas.getByTestId('dock-section-views')).toBeInTheDocument();
    // Docked, the panel splits: the properties above the seam, the other sections below.
    await expect(await canvas.findByTestId('dock-splitter')).toBeInTheDocument();
  },
};

/** A view node onto a nested View: its open control drills into the child View, and Up returns. */
export const View: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'view' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. The view node shows its label and an open control; the root has nowhere up to go.
    await waitFor(() => expect(canvasElement.querySelector('[data-node-id="view"]')).toHaveTextContent('View'));
    await waitFor(() => expect(canvas.getByTestId('toolbar-up')).toBeDisabled());
    // 2. Opening the view node drills into its View, once the camera has animated into it, which a loaded run slows.
    await userEvent.click(await canvas.findByTestId('portal-open'));
    await waitFor(() => expect(canvas.getByTestId('toolbar-up')).toBeEnabled(), { timeout: 5_000 });
    await waitFor(() => expect(canvasElement.querySelector('[data-node-id="b"]')).not.toBeNull());
    // 3. The background's menu offers Back there, which returns to the root.
    const viewport = await canvas.findByTestId('scene-view');
    const { left, top } = viewport.getBoundingClientRect();
    await fireEvent.contextMenu(viewport, { clientX: left + 8, clientY: top + 8 });
    const back = await screen.findByTestId('menu-back');
    const items = [...(back.closest('[role="menu"]')?.querySelectorAll('[role="menuitem"]') ?? [])];
    // Keyboard, since zag ignores the synthetic pointer events a test can send.
    await userEvent.keyboard('{ArrowDown}'.repeat(items.indexOf(back) + 1) + '{Enter}');
    await waitFor(() => expect(canvas.getByTestId('toolbar-up')).toBeDisabled(), { timeout: 5_000 });
  },
};

/** An element's row, as the Views section lists it. */
const viewRow = (root: HTMLElement, id: string) => within(root).getByTestId(`views-row-${id}`);

/** Whether a row shows as selected: a branch carries the state on its tree item, around the row. */
const rowSelected = (root: HTMLElement, id: string) =>
  viewRow(root, id).closest('[role="treeitem"]')?.getAttribute('aria-selected') === 'true';

/**
 * The Views section over a nested scene: a row selects on the canvas (opening its View first), the canvas selection
 * marks its rows, a View row's Open drills in, and the filter narrows the rows.
 */
export const Views: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'nested', inspectors: 'docked' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dock = await canvas.findByTestId('scene-view-dock');
    await waitFor(() => expect(canvasElement.querySelector('[data-node-id="a"]')).not.toBeNull());
    // 1. The Views section opens on the root View's rows.
    await userEvent.click(
      within(within(dock).getByTestId('dock-section-views')).getByRole('button', { name: 'Views' }),
    );
    const views = await within(dock).findByTestId('views');
    await waitFor(() => expect(viewRow(views, 'b')).toBeVisible());

    // 2. A row selects its element on the canvas: the properties section appears and the row is marked.
    await userEvent.click(viewRow(views, 'b'));
    await waitFor(() => expect(within(dock).getByTestId('dock-section-properties')).toBeInTheDocument());
    await waitFor(() => expect(rowSelected(views, 'b')).toBe(true));

    // 3. The canvas selection marks its rows: select all from the canvas.
    canvas.getByTestId('scene-view').focus();
    await userEvent.keyboard('{Meta>}a{/Meta}');
    await waitFor(() => expect(rowSelected(views, 'a')).toBe(true));
    await expect(rowSelected(views, 'c')).toBe(true);

    // 4. The filter narrows the rows to the matches and their Views.
    const filter = within(views).getByTestId('views-filter');
    await userEvent.type(filter, 'D');
    await waitFor(() => expect(within(views).queryByTestId('views-row-a')).toBeNull());
    await expect(viewRow(views, 'c')).toBeInTheDocument();
    await expect(viewRow(views, 'c/d')).toBeInTheDocument();
    await userEvent.clear(filter);
    await waitFor(() => expect(viewRow(views, 'a')).toBeInTheDocument());

    // 5. Double-clicking a View row drills the canvas into it.
    await userEvent.dblClick(viewRow(views, 'c'));
    await waitFor(() => expect(canvas.getByTestId('toolbar-up')).toBeEnabled(), { timeout: 5_000 });

    // 6. A row in another View opens that View first, then selects there.
    await userEvent.click(viewRow(views, 'a'));
    await waitFor(() => expect(canvas.getByTestId('toolbar-up')).toBeDisabled());
    await waitFor(() => expect(rowSelected(views, 'a')).toBe(true));

    // 7. The root View's row selects everything in it, as a View's contents.
    await userEvent.click(views.querySelector<HTMLElement>('[data-tree-row]') ?? views);
    await waitFor(() => expect(rowSelected(views, 'b')).toBe(true));
    await expect(rowSelected(views, 'a')).toBe(true);
    await expect(rowSelected(views, 'c')).toBe(true);
  },
};

/** The node `id` as the View draws it, not inside an Instance's drawing of its Object. */
const topLevelNode = (root: HTMLElement, selector: string) =>
  [...root.querySelectorAll(`[data-testid="scene-view"] ${selector}`)].find(
    (element) => !element.closest('[data-instance]'),
  );

/**
 * Group and Ungroup: ⌘G makes an anonymous Object and one Instance in place of the selection, ⇧⌘G puts its contents
 * back and deletes the definition, and each is one undo step. The fixture has no view node, since an Object cannot
 * contain a View (SPEC.mdl F-9.9).
 */
export const Group: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'pair', inspectors: 'docked' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = await canvas.findByTestId('scene-view');
    await waitFor(() => expect(topLevelNode(canvasElement, '[data-node-id="a"]')).toBeDefined());
    const instance = () => topLevelNode(canvasElement, '[data-node-id^="instance-"]');

    // 1. Select all and group: one Instance replaces the shapes, drawing them inside it.
    view.focus();
    await userEvent.keyboard('{Meta>}a{/Meta}');
    await userEvent.keyboard('{Meta>}g{/Meta}');
    await waitFor(() => expect(topLevelNode(canvasElement, '[data-node-id="a"]')).toBeUndefined());
    await waitFor(() => expect(instance()).toBeDefined());
    await expect(instance()?.querySelector('[data-node-id="a"]')).not.toBeNull();

    // 2. Undo takes the group back in one step; redo makes it again.
    view.focus();
    await userEvent.keyboard('{Meta>}z{/Meta}');
    await waitFor(() => expect(topLevelNode(canvasElement, '[data-node-id="a"]')).toBeDefined());
    await expect(instance()).toBeUndefined();
    await userEvent.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}');
    await waitFor(() => expect(instance()).toBeDefined());

    // 3. Ungroup puts the contents back where the Instance drew them, under new ids.
    view.focus();
    await userEvent.keyboard('{Meta>}a{/Meta}');
    await userEvent.keyboard('{Meta>}{Shift>}g{/Shift}{/Meta}');
    await waitFor(() => expect(instance()).toBeUndefined());
    await waitFor(() => expect(topLevelNode(canvasElement, '[data-node-id^="node-"]')).toBeDefined());

    // 4. Undo brings the Instance back, and with it the definition it draws.
    view.focus();
    await userEvent.keyboard('{Meta>}z{/Meta}');
    await waitFor(() => expect(instance()?.querySelector('[data-node-id="a"]')).not.toBeNull());

    // 5. A row inside the group opens its Object on its own and selects the node there.
    const id = instance()?.getAttribute('data-node-id') ?? '';
    const dock = await canvas.findByTestId('scene-view-dock');
    await userEvent.click(
      within(within(dock).getByTestId('dock-section-views')).getByRole('button', { name: 'Views' }),
    );
    const views = await within(dock).findByTestId('views');
    const group = viewRow(views, id);
    await userEvent.click(group.querySelector<HTMLElement>('[data-part="branch-trigger"]') ?? group);
    await userEvent.click(await within(views).findByTestId(`views-row-${id}/a`));
    await waitFor(() => expect(topLevelNode(canvasElement, '[data-node-id="a"]')).toBeDefined());
    await waitFor(() => expect(rowSelected(views, `${id}/a`)).toBe(true));
  },
};

/** The polylines on the canvas, as drawn. */
const polylines = (root: HTMLElement) => [
  ...root.querySelectorAll('[data-testid="scene-view"] [data-node-id^="polyline-"]'),
];

/**
 * The polyline tool (Y) draws an irregular line vertex by vertex: each click places one, Enter or a double-click ends
 * it open, a click on the first vertex closes it, Backspace takes back the last vertex and Escape drops the drawing.
 */
export const Polyline: Story = {
  args: { depth: 0, liveDepth: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = await canvas.findByTestId('scene-view');
    const rect = view.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const click = async (dx: number, dy: number) => {
      const at = { clientX: center.x + dx, clientY: center.y + dy, button: 0, pointerId: 1 };
      await fireEvent.pointerDown(view, at);
      await fireEvent.pointerMove(view, at);
      await fireEvent.pointerUp(view, at);
    };

    // 1. Three clicks and a click back on the first vertex draw a closed polyline, which is selected.
    view.focus();
    await userEvent.keyboard('y');
    await click(-200, -100);
    await click(-40, -100);
    await click(-120, 0);
    await expect(await canvas.findByTestId('vertex-band')).toBeInTheDocument();
    await click(-200, -100);
    await waitFor(() => expect(polylines(canvasElement)).toHaveLength(1));
    await expect(canvas.queryByTestId('vertex-band')).toBeNull();
    const closed = await canvas.findByRole('switch', { name: 'Closed' });
    await waitFor(() => expect(closed).toBeChecked());

    // 2. Enter ends a line open.
    view.focus();
    await userEvent.keyboard('y');
    await click(40, 40);
    await click(200, 120);
    await click(120, 200);
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(polylines(canvasElement)).toHaveLength(2));
    await waitFor(() => expect(canvas.getByRole('switch', { name: 'Closed' })).not.toBeChecked());

    // 3. The switch closes the open line.
    await userEvent.click(canvas.getByRole('switch', { name: 'Closed' }));
    await waitFor(() => expect(canvas.getByRole('switch', { name: 'Closed' })).toBeChecked());

    // 4. Backspace takes back vertices and Escape drops the drawing: nothing lands.
    view.focus();
    await userEvent.keyboard('y');
    await click(-200, 120);
    await click(-40, 200);
    await userEvent.keyboard('{Backspace}');
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByTestId('vertex-band')).toBeNull();
    await expect(polylines(canvasElement)).toHaveLength(2);
  },
};

/** The vertex handles of the polyline in vertex edit mode. */
const vertexHandles = (root: HTMLElement) => [...root.querySelectorAll('[data-testid="vertex-handle"]')];

/** The centre of an element on screen. */
const centreOf = (element: Element) => {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { clientX: left + width / 2, clientY: top + height / 2 };
};

/**
 * Edit mode: a double-click on a polyline shows its vertices to drag, and on a box opens its label; Enter, Escape or a
 * press outside the node leaves either.
 */
export const PolylineEdit: Story = {
  args: { depth: 0, liveDepth: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = await canvas.findByTestId('scene-view');
    const rect = view.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const at = (dx: number, dy: number) => ({
      clientX: center.x + dx,
      clientY: center.y + dy,
      button: 0,
      pointerId: 1,
    });
    const click = async (dx: number, dy: number) => {
      await fireEvent.pointerDown(view, at(dx, dy));
      await fireEvent.pointerMove(view, at(dx, dy));
      await fireEvent.pointerUp(view, at(dx, dy));
    };
    const doubleClick = async (element: Element) => {
      const point = centreOf(element);
      await fireEvent.pointerDown(element, { ...point, button: 0, pointerId: 1 });
      await fireEvent.pointerUp(view, { ...point, button: 0, pointerId: 1 });
      await fireEvent.dblClick(element, point);
    };

    // 1. Draw an open polyline; a double-click on it shows a handle per vertex and hides the resize handles.
    view.focus();
    await userEvent.keyboard('y');
    await click(-200, -120);
    await click(-40, -40);
    await click(-200, 40);
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(polylines(canvasElement)).toHaveLength(1));
    const [line] = polylines(canvasElement);
    await doubleClick(line);
    await waitFor(() => expect(vertexHandles(canvasElement)).toHaveLength(3));
    await expect(canvasElement.querySelectorAll('svg rect[style*="resize"]')).toHaveLength(0);

    // 2. Dragging a vertex moves it and refits the frame, as one undo step.
    const before = line.getBoundingClientRect();
    const handle = vertexHandles(canvasElement)[1];
    await fireEvent.pointerDown(handle, { ...centreOf(handle), button: 0, pointerId: 1 });
    await fireEvent.pointerMove(view, at(80, -40));
    await fireEvent.pointerUp(view, at(80, -40));
    await waitFor(() => expect(line.getBoundingClientRect().width).toBeGreaterThan(before.width + 60));
    await expect(vertexHandles(canvasElement)).toHaveLength(3);

    // 3. Escape leaves vertex edit mode; the line stays selected.
    view.focus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(vertexHandles(canvasElement)).toHaveLength(0));
    await expect(canvasElement.querySelectorAll('svg rect[style*="resize"]').length).toBeGreaterThan(0);

    // 4. Undo takes the vertex back in one step.
    await userEvent.keyboard('{Meta>}z{/Meta}');
    await waitFor(() => expect(line.getBoundingClientRect().width).toBeCloseTo(before.width, 0));

    // 5. A segment's midpoint adds a vertex, Backspace removes the one last pressed, and Enter leaves the mode.
    await doubleClick(line);
    await waitFor(() => expect(vertexHandles(canvasElement)).toHaveLength(3));
    const [midpoint] = canvas.getAllByTestId('vertex-midpoint');
    await fireEvent.pointerDown(midpoint, { ...centreOf(midpoint), button: 0, pointerId: 1 });
    await fireEvent.pointerUp(view, { ...centreOf(midpoint), button: 0, pointerId: 1 });
    await waitFor(() => expect(vertexHandles(canvasElement)).toHaveLength(4));
    view.focus();
    await userEvent.keyboard('{Backspace}');
    await waitFor(() => expect(vertexHandles(canvasElement)).toHaveLength(3));
    await expect(polylines(canvasElement)).toHaveLength(1);
    view.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(vertexHandles(canvasElement)).toHaveLength(0));

    // 6. So does a press outside the node; Enter on the line selected alone enters the mode again.
    await doubleClick(line);
    await waitFor(() => expect(vertexHandles(canvasElement)).toHaveLength(3));
    await click(240, 200);
    await waitFor(() => expect(vertexHandles(canvasElement)).toHaveLength(0));
    await fireEvent.pointerDown(line, { ...centreOf(line), button: 0, pointerId: 1 });
    await fireEvent.pointerUp(view, { ...centreOf(line), button: 0, pointerId: 1 });
    view.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(vertexHandles(canvasElement)).toHaveLength(3));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(vertexHandles(canvasElement)).toHaveLength(0));

    // 7. A double-click on a box still edits its label: Escape rejects, Enter commits, a click outside commits.
    view.focus();
    await userEvent.keyboard('r');
    await fireEvent.pointerDown(view, at(80, -160));
    await fireEvent.pointerMove(view, at(240, -40));
    await fireEvent.pointerUp(view, at(240, -40));
    const box = await waitFor(() => {
      const node = canvasElement.querySelector('[data-testid="scene-view"] [data-node-id^="rect-"]');
      if (!node) {
        throw new Error('The box has not landed.');
      }
      return node;
    });
    await doubleClick(box);
    await userEvent.keyboard('Draft');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('part-editor')).toBeNull());
    await expect(box.textContent).not.toContain('Draft');

    await doubleClick(box);
    await expect(await canvas.findByTestId('part-editor')).toBeInTheDocument();
    await userEvent.keyboard('Hello');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(canvas.queryByTestId('part-editor')).toBeNull());
    await waitFor(() => expect(box.textContent).toContain('Hello'));

    await doubleClick(box);
    await expect(await canvas.findByTestId('part-editor')).toBeInTheDocument();
    await userEvent.keyboard(' world');
    await userEvent.click(view);
    await waitFor(() => expect(canvas.queryByTestId('part-editor')).toBeNull());
    await waitFor(() => expect(box.textContent).toContain('Hello world'));

    // 8. Enter on the box selected alone opens its label.
    await click(160, -80);
    view.focus();
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByTestId('part-editor')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('part-editor')).toBeNull());
  },
};
