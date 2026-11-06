//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as Spec from '@dxos/compute/Spec';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FeatureEditingPlugin, FeatureSeed } from '@dxos/plugin-code/testing';
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
import { FeatureMap } from '#types';

import { FeatureCompanion } from '../FeatureCompanion/index.ts';
import { SpecFeatures } from './SpecFeatures.tsx';

type StoryArgs = { attendableId: string };

const DefaultStory = ({ attendableId }: StoryArgs) => {
  const [space] = useSpaces();
  // The seeded spec is the project's; the subfeatures' specs are owned by their features.
  const spec = useQuery(space?.db, Filter.type(Spec.Spec)).find((spec) => !FeatureMap.getOwner(spec));
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
  title: 'plugins/plugin-code/containers/SpecFeatures',
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

/** Kanban: a column per status, and dragging a card to another column sets the feature's status. */
export const Kanban: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
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
