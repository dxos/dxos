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
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';
import { FeatureMap } from '#types';

import { FeatureMapArticle } from './FeatureMapArticle.tsx';

type StoryArgs = { role: string; attendableId: string };

const DefaultStory = ({ role, attendableId }: StoryArgs) => {
  const [space] = useSpaces();
  const [map] = useQuery(space?.db, Filter.type(FeatureMap.FeatureMap));
  if (!map) {
    return <Loading data={{ db: !!space?.db, map: !!map }} />;
  }

  // Marks the subtree attendable, as the deck's plank does, so the toolbar is live.
  return (
    <AttendableContainer id={attendableId} classNames='contents'>
      <FeatureMapArticle role={role} subject={map} attendableId={attendableId} />
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

const openCardMenu = async (card: HTMLElement) => {
  await userEvent.click(within(within(card).getByTestId('feature-card.menu')).getByRole('button'));
};

const meta = {
  title: 'plugins/plugin-projects/containers/FeatureMapArticle',
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
    withTheme(),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations, ...formTranslations],
  },
  args: { role: 'article', attendableId: 'test' },
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

/** The same map on the canvas, laid out by dependency with an arrow per `DependsOn`. */
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

/** Removing a card takes the feature off this map only. */
export const RemoveFromMap: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-card')).toHaveLength(8), { timeout: 10_000 });
    await openCardMenu(await findCard(canvasElement, 'Smart triage'));
    await userEvent.click(await screen.findByTestId('feature-card.remove'));
    await waitFor(() => expect(canvas.getAllByTestId('feature-card')).toHaveLength(7), { timeout: 5_000 });
    await expect(canvas.queryByText('Smart triage')).toBeNull();
  },
};

/** The toolbar's add button creates a feature named from the query and puts it on the map. */
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

/** Selecting a box and pressing Delete removes the feature from the map, not from the space. */
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

/** The toolbar's New feature puts an unnamed card on the map with its name field open, so it is named in place. */
export const NewFeature: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-card')).toHaveLength(8), { timeout: 10_000 });
    await userEvent.click(canvas.getByTestId('feature-map.new-feature'));
    // Every card holds a hidden name field; the new card's is the one that takes focus.
    await waitFor(() => expect(document.activeElement?.getAttribute('data-testid')).toBe('feature-card.name.input'), {
      timeout: 5_000,
    });
    await userEvent.keyboard('Offline mode{Enter}');
    await waitFor(() => expect(canvas.getAllByTestId('feature-card')).toHaveLength(9));
    await expect(await canvas.findByText('Offline mode', undefined, { timeout: 5_000 })).toBeInTheDocument();
  },
};

/** A card's name and description are edited in place with a double-click. */
export const EditInline: Story = {
  play: async ({ canvasElement }) => {
    const card = within(await findCard(canvasElement, 'Smart triage'));
    await userEvent.dblClick(card.getByTestId('feature-card.name.preview'));
    const name = card.getByTestId('feature-card.name.input');
    await userEvent.clear(name);
    await userEvent.type(name, 'Smart inbox{Enter}');
    await expect(await card.findByText('Smart inbox', undefined, { timeout: 5_000 })).toBeInTheDocument();

    await userEvent.dblClick(card.getByTestId('feature-card.description.preview'));
    await userEvent.type(card.getByTestId('feature-card.description.input'), 'Sorts mail before you read it{Enter}');
    await expect(
      await card.findByText('Sorts mail before you read it', undefined, { timeout: 5_000 }),
    ).toBeInTheDocument();
  },
};

/** On the canvas a box's name opens from its pencil, since a double-click on the box opens the feature. */
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
    const [pencil] = within(node).getAllByTestId('editable.edit');
    await userEvent.click(pencil);
    const name = within(node).getByTestId('feature-card.name.input');
    await userEvent.clear(name);
    // Backspace inside the field must edit the text, not delete the selected box.
    await userEvent.type(name, 'Smart inbox{Backspace}x{Enter}');
    await expect(await within(node).findByText('Smart inbox', undefined, { timeout: 5_000 })).toBeInTheDocument();
    await expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(8);
  },
};
