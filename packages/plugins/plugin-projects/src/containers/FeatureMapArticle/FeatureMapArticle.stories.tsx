//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FeatureSeed } from '@dxos/plugin-projects/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
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
      ],
    }),
    withTheme(),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations],
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
