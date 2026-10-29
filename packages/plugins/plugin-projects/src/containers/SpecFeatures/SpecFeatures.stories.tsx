//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FeatureEditingPlugin, FeatureSeed } from '@dxos/plugin-projects/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import * as Layout from '@dxos/react-ui/Layout';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';
import { Spec } from '#types';

import { FeatureCompanion } from '../FeatureCompanion/index.ts';
import { SpecFeatures } from './SpecFeatures.tsx';

type StoryArgs = { attendableId: string };

const DefaultStory = ({ attendableId }: StoryArgs) => {
  const [space] = useSpaces();
  // The seeded spec is the top-level one; the subfeatures' specs are owned by their features.
  const [spec] = useQuery(space?.db, Filter.and(Filter.type(Spec.Spec), Filter.hasParent(false)));
  if (!spec) {
    return <Loading data={{ db: !!space?.db, spec: !!spec }} />;
  }

  // Marks the subtree attendable, as the deck's plank does, so the toolbar is live; the companion sits beside the map
  // with the plank's id, as the deck places it.
  return (
    <AttendableContainer id={attendableId} classNames='contents'>
      <Layout.Grid classNames='dx-fill grid-cols-[1fr_24rem] divide-x divide-separator'>
        <SpecFeatures spec={spec} attendableId={attendableId} />
        <FeatureCompanion spec={spec} attendableId={attendableId} />
      </Layout.Grid>
    </AttendableContainer>
  );
};

/** The element a pointer at the centre of `element` would hit, so a covered control fails even when `click` would not. */
const expectHittable = async (element: HTMLElement) => {
  const { x, y, width, height } = element.getBoundingClientRect();
  const hit = document.elementFromPoint(x + width / 2, y + height / 2);
  await expect(hit && element.contains(hit)).toBe(true);
};

/** The canvas box that holds a feature's card; its frame takes the presses that select and zoom. */
const findNode = async (canvasElement: HTMLElement, name: string) => {
  const canvas = within(canvasElement);
  await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node').length).toBeGreaterThan(0), {
    timeout: 10_000,
  });
  const node = canvas.getAllByTestId('feature-canvas-node').find((node) => within(node).queryByText(name));
  const frame = node?.closest<HTMLElement>('[data-node-id]');
  if (!frame) {
    throw new Error(`No box for ${name}`);
  }
  return frame;
};

/** The companion once it shows a feature; it mounts after the selection reaches it. */
const companion = async () => within(await screen.findByTestId('feature-companion', undefined, { timeout: 5_000 }));

/** A double-click at the element's centre: the canvas hit-tests the pointer's position, which `userEvent` leaves at 0,0. */
const doubleClick = (element: HTMLElement) => {
  const { x, y, width, height } = element.getBoundingClientRect();
  const init = { bubbles: true, cancelable: true, clientX: x + width / 2, clientY: y + height / 2 };
  element.dispatchEvent(new MouseEvent('dblclick', { ...init, detail: 2 }));
};

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

const dispatchDrag = (element: HTMLElement, type: string, dataTransfer: DataTransfer) => {
  const { x, y, width, height } = element.getBoundingClientRect();
  element.dispatchEvent(
    new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      dataTransfer,
      clientX: x + width / 2,
      clientY: y + height / 2,
    }),
  );
};

const findKanbanColumn = (canvasElement: HTMLElement, status: string) => {
  const column = canvasElement.querySelector<HTMLElement>(`[data-testid="board-column"][data-status="${status}"]`);
  if (!column) {
    throw new Error(`No column for ${status}`);
  }
  return column;
};

const meta = {
  title: 'plugins/plugin-projects/containers/SpecFeatures',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: FeatureSeed.types,
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                FeatureSeed.seed(defaultSpace.db);
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
        FeatureEditingPlugin.make(),
      ],
    }),
    // The deck provides the drag-and-drop root in the app; the Kanban view needs one here.
    withMosaic(),
    withTheme(),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations, ...formTranslations],
  },
  args: { attendableId: 'test' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The map opens on the canvas: one box per top-level feature, laid out by dependency with an arrow per `DependsOn`. */
export const Canvas: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(8), { timeout: 10_000 });
    await expect(canvas.getByTestId('feature-companion.empty')).toBeInTheDocument();
    // The body must sit below the toolbar, not over it.
    await expectHittable(canvas.getByTestId('projectsPlugin.featureMap.kanban'));
  },
};

/** A click selects a feature and the companion shows it in full: the ideal, its requirements and its subfeatures. */
export const SelectShowsCompanion: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(await findNode(canvasElement, 'Provider sync'));
    const detail = await companion();
    await expect(await detail.findAllByTestId(/^requirement-editor\.\d+\.text$/)).toHaveLength(3);
    await expect(await detail.findByText('IMAP')).toBeInTheDocument();
  },
};

/** A double-click zooms into the feature's subfeatures; the trail above the map zooms back out. */
export const ZoomIn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    doubleClick(await findNode(canvasElement, 'Provider sync'));
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(2), { timeout: 10_000 });
    const trail = within(canvas.getByTestId('feature-map.trail'));
    await expect(trail.getByText('Provider sync')).toHaveAttribute('aria-current', 'page');
    await userEvent.click(trail.getByText('All features'));
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(8), { timeout: 10_000 });
    await expect(canvas.queryByTestId('feature-map.trail')).toBeNull();
  },
};

/** Fields are edited in the companion, where they have room; the card follows. */
export const EditInCompanion: Story = {
  play: async ({ canvasElement }) => {
    const node = await findNode(canvasElement, 'Smart triage');
    await userEvent.click(node);
    const name = await (await companion()).findByDisplayValue('Smart triage', undefined, { timeout: 5_000 });
    await userEvent.clear(name);
    await userEvent.type(name, 'Smart inbox');
    await userEvent.tab();
    await expect(await within(node).findByText('Smart inbox', undefined, { timeout: 5_000 })).toBeInTheDocument();
  },
};

/** The toolbar's add button creates a feature named from the query and puts it on the map. */
export const CreateFeature: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(8), { timeout: 10_000 });
    await userEvent.click(canvas.getByTestId('feature-map.add-feature'));
    // Typed before the popup's search field takes focus, the query would go nowhere.
    await waitFor(() => expect(document.activeElement?.tagName).toBe('INPUT'));
    await userEvent.keyboard('Offline mode');
    await userEvent.click(await screen.findByText(/Offline mode/, { selector: '[role="option"] *' }));
    await userEvent.click(await screen.findByRole('button', { name: /save/i }));
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(9), { timeout: 5_000 });
  },
};

/** New feature adds one to the level shown and selects it, so it is named in the companion. */
export const NewFeature: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(8), { timeout: 10_000 });
    await userEvent.click(canvas.getByTestId('feature-map.new-feature'));
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(9), { timeout: 5_000 });
    const detail = await companion();
    await expect(await detail.findByDisplayValue('New feature', undefined, { timeout: 5_000 })).toBeInTheDocument();
  },
};

/** Selecting a box and pressing Delete deletes the feature, with the spec that breaks it down. */
export const CanvasRemove: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await findNode(canvasElement, 'Smart triage'));
    await userEvent.keyboard('{Delete}');
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(7), { timeout: 5_000 });
  },
};

/** Kanban: a column per status, and dragging a card to another column sets the feature's status. */
export const Kanban: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByTestId('projectsPlugin.featureMap.kanban', undefined, { timeout: 10_000 }),
    );
    await waitFor(() => expect(canvas.getAllByTestId('board-column')).toHaveLength(4), { timeout: 10_000 });
    await waitFor(() => expect(canvas.getAllByTestId('feature-kanban.card')).toHaveLength(8), { timeout: 10_000 });

    const cardIn = (status: string, name: string) =>
      [
        ...findKanbanColumn(canvasElement, status).querySelectorAll<HTMLElement>('[data-testid="feature-kanban.card"]'),
      ].find((card) => within(card).queryByText(name));
    await waitFor(() => expect(cardIn('planned', 'Smart triage')).toBeDefined(), { timeout: 10_000 });
    const source = cardIn('planned', 'Smart triage');
    if (!source) {
      throw new Error('Smart triage is not in the planned column');
    }
    await expect(source).toHaveAttribute('draggable', 'true');

    const target = findKanbanColumn(canvasElement, 'prototype').querySelector<HTMLElement>(
      '[data-mosaic-container-state]',
    );
    if (!target) {
      throw new Error('No drop container in the prototype column');
    }
    const dataTransfer = new DataTransfer();
    dispatchDrag(source, 'dragstart', dataTransfer);
    let dropped = false;
    try {
      // pragmatic-dnd starts the drag a frame after `dragstart`, once the native preview has been taken.
      await nextFrame();
      await nextFrame();
      dispatchDrag(target, 'dragenter', dataTransfer);
      dispatchDrag(target, 'dragover', dataTransfer);
      await waitFor(() => expect(target.dataset.mosaicContainerState).toBe('active'), { timeout: 5_000 });
      dispatchDrag(target, 'drop', dataTransfer);
      dropped = true;
    } finally {
      dropped || dispatchDrag(source, 'dragend', dataTransfer);
    }

    await waitFor(() => expect(cardIn('prototype', 'Smart triage')).toBeDefined(), { timeout: 5_000 });
    await expect(cardIn('planned', 'Smart triage')).toBeUndefined();
    await expect(
      within(cardIn('prototype', 'Smart triage') ?? canvasElement).getByTestId('feature-card').dataset.status,
    ).toBe('prototype');
  },
};
