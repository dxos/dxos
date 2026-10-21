//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as Project from '@dxos/compute/Project';
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
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { ProjectFeatures } from './ProjectFeatures.tsx';

type StoryArgs = { attendableId: string };

const DefaultStory = ({ attendableId }: StoryArgs) => {
  const [space] = useSpaces();
  const [project] = useQuery(space?.db, Filter.type(Project.Project));
  if (!project) {
    return <Loading data={{ db: !!space?.db, project: !!project }} />;
  }

  // Marks the subtree attendable, as the deck's plank does, so the toolbar is live.
  return (
    <AttendableContainer id={attendableId} classNames='contents'>
      <ProjectFeatures project={project} attendableId={attendableId} />
    </AttendableContainer>
  );
};

/** The element a pointer at the centre of `element` would hit, so a covered control fails even when `click` would not. */
const expectHittable = async (element: HTMLElement) => {
  const { x, y, width, height } = element.getBoundingClientRect();
  const hit = document.elementFromPoint(x + width / 2, y + height / 2);
  await expect(hit && element.contains(hit)).toBe(true);
};

const findCard = async (canvasElement: HTMLElement, name: string) => {
  const canvas = within(canvasElement);
  await canvas.findByText(name, undefined, { timeout: 10_000 });
  const card = canvas.getAllByTestId('feature-card').find((card) => within(card).queryByText(name));
  if (!card) {
    throw new Error(`No card for ${name}`);
  }
  // The board's masonry hides its tiles until they are measured, and a hidden card answers no role queries.
  await waitFor(() => expect(card).toBeVisible(), { timeout: 10_000 });
  return card;
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

const openCardMenu = async (card: HTMLElement) => {
  await userEvent.click(within(within(card).getByTestId('feature-card.menu')).getByRole('button'));
};

const meta = {
  title: 'plugins/plugin-projects/containers/ProjectFeatures',
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

/** Live objects as cards: every card's warnings, tasks and showcases come from relations in the space. */
export const Cards: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Provider sync', undefined, { timeout: 10_000 })).toBeInTheDocument();
    await waitFor(() => expect(canvas.getAllByTestId('feature-card')).toHaveLength(8), { timeout: 10_000 });
    await expect(canvas.getAllByText('2 open tasks').length).toBeGreaterThan(0);
    // The body must sit below the toolbar, not over it.
    await expectHittable(canvas.getByTestId('projectsPlugin.featureMap.canvas'));
  },
};

/** The same features on the canvas, laid out by dependency with an arrow per `DependsOn`. */
export const Canvas: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByTestId('projectsPlugin.featureMap.canvas', undefined, { timeout: 10_000 }),
    );
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(8), { timeout: 10_000 });
    await expectHittable(canvas.getByTestId('projectsPlugin.featureMap.cards'));
  },
};

/** Status is set from the card's menu, through the same operation an agent uses. */
export const SetStatus: Story = {
  play: async ({ canvasElement }) => {
    const card = await findCard(canvasElement, 'Smart triage');
    await expect(card.dataset.status).toBe('planned');
    await openCardMenu(card);
    await userEvent.click(await screen.findByTestId('feature-card.status.in-progress'));
    await waitFor(() => expect(card.dataset.status).toBe('in-progress'), { timeout: 5_000 });
  },
};

/** Removing a card takes the feature off this project only. */
export const RemoveFromProject: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-card')).toHaveLength(8), { timeout: 10_000 });
    await openCardMenu(await findCard(canvasElement, 'Smart triage'));
    await userEvent.click(await screen.findByTestId('feature-card.remove'));
    await waitFor(() => expect(canvas.getAllByTestId('feature-card')).toHaveLength(7), { timeout: 5_000 });
    await expect(canvas.queryByText('Smart triage')).toBeNull();
  },
};

/** The toolbar's add button creates a feature named from the query and puts it in the project. */
export const CreateFeature: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-card')).toHaveLength(8), { timeout: 10_000 });
    await userEvent.click(canvas.getByTestId('feature-map.add-feature'));
    // Typed before the popup's search field takes focus, the query would go nowhere.
    await waitFor(() => expect(document.activeElement?.tagName).toBe('INPUT'));
    await userEvent.keyboard('Offline mode');
    await userEvent.click(await screen.findByText(/Offline mode/, { selector: '[role="option"] *' }));
    await userEvent.click(await screen.findByRole('button', { name: /save/i }));
    await waitFor(() => expect(canvas.getAllByTestId('feature-card')).toHaveLength(9), { timeout: 5_000 });
    await expect(canvas.getByText('Offline mode')).toBeInTheDocument();
  },
};

/** Selecting a box and pressing Delete removes the feature from the project, not from the space. */
export const CanvasRemove: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByTestId('projectsPlugin.featureMap.canvas', undefined, { timeout: 10_000 }),
    );
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(8), { timeout: 10_000 });
    // The card inside a box ignores the pointer; the box's frame takes the press that selects it.
    const frame = canvas.getAllByTestId('feature-canvas-node')[0].closest<HTMLElement>('[data-node-id]');
    if (!frame) {
      throw new Error('No node frame');
    }
    await userEvent.click(frame);
    await userEvent.keyboard('{Delete}');
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(7), { timeout: 5_000 });
  },
};

/** The toolbar's New feature puts an unnamed card in the project with its name field open, so it is named in place. */
export const NewFeature: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-card')).toHaveLength(8), { timeout: 10_000 });
    await userEvent.click(canvas.getByTestId('feature-map.new-feature'));
    // The new card opens in edit mode with its name field focused.
    await waitFor(() => expect(document.activeElement?.getAttribute('data-testid')).toBe('feature-card.name.input'), {
      timeout: 5_000,
    });
    await userEvent.keyboard('Offline mode{Enter}');
    await waitFor(() => expect(canvas.getAllByTestId('feature-card')).toHaveLength(9));
    await userEvent.click(canvas.getByTestId('feature-card.done'));
    await expect(await canvas.findByText('Offline mode', undefined, { timeout: 5_000 })).toBeInTheDocument();
  },
};

/** The header's edit button puts a card in edit mode, where its name and description are fields. */
export const EditInline: Story = {
  play: async ({ canvasElement }) => {
    const card = within(await findCard(canvasElement, 'Smart triage'));
    await userEvent.click(card.getByTestId('feature-card.edit'));
    const name = card.getByTestId('feature-card.name.input');
    await userEvent.clear(name);
    await userEvent.type(name, 'Smart inbox{Enter}');
    const description = card.getByTestId('feature-card.description.input');
    await userEvent.clear(description);
    await userEvent.type(description, 'Sorts mail before you read it{Enter}');
    await userEvent.click(card.getByTestId('feature-card.done'));
    await expect(await card.findByText('Smart inbox', undefined, { timeout: 5_000 })).toBeInTheDocument();
    await expect(
      await card.findByText('Sorts mail before you read it', undefined, { timeout: 5_000 }),
    ).toBeInTheDocument();
    await expect(card.queryByTestId('feature-card.name.input')).toBeNull();
  },
};

/** On the canvas a box's edit button opens its fields, since a double-click on the box opens the feature. */
export const CanvasRename: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByTestId('projectsPlugin.featureMap.canvas', undefined, { timeout: 10_000 }),
    );
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(8), { timeout: 10_000 });
    const node = canvas.getAllByTestId('feature-canvas-node').find((node) => within(node).queryByText('Smart triage'));
    if (!node) {
      throw new Error('No box for Smart triage');
    }
    await userEvent.click(within(node).getByTestId('feature-card.edit'));
    const name = within(node).getByTestId('feature-card.name.input');
    await userEvent.clear(name);
    // Backspace inside the field must edit the text, not delete the selected box.
    await userEvent.type(name, 'Smart inbox{Backspace}x{Enter}');
    await userEvent.click(within(node).getByTestId('feature-card.done'));
    await expect(await within(node).findByText('Smart inbox', undefined, { timeout: 5_000 })).toBeInTheDocument();
    await expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(8);
  },
};

/** Kanban: a column per status, and dragging a card to another column sets the feature's status. */
export const Kanban: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByTestId('projectsPlugin.featureMap.kanban', undefined, { timeout: 10_000 }),
    );
    await waitFor(() => expect(canvas.getAllByTestId('board-column')).toHaveLength(5), { timeout: 10_000 });
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

    const target = findKanbanColumn(canvasElement, 'in-progress').querySelector<HTMLElement>(
      '[data-mosaic-container-state]',
    );
    if (!target) {
      throw new Error('No drop container in the in-progress column');
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

    await waitFor(() => expect(cardIn('in-progress', 'Smart triage')).toBeDefined(), { timeout: 5_000 });
    await expect(cardIn('planned', 'Smart triage')).toBeUndefined();
    await expect(
      within(cardIn('in-progress', 'Smart triage') ?? canvasElement).getByTestId('feature-card').dataset.status,
    ).toBe('in-progress');
  },
};
