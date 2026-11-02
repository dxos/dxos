//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FeatureEditingPlugin, FeatureSeed } from '@dxos/plugin-code/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';
import { Feature } from '#types';

import { FeatureSection } from './FeatureSection.tsx';

const FEATURE_NAME = 'Provider sync';

type StoryArgs = { attendableId: string };

const DefaultStory = ({ attendableId }: StoryArgs) => {
  const [space] = useSpaces();
  const features = useQuery(space?.db, Filter.type(Feature.Feature));
  const feature = features.find((feature) => feature.name === FEATURE_NAME);
  if (!feature) {
    return <Loading data={{ db: !!space?.db, feature: !!feature }} />;
  }

  return (
    <AttendableContainer id={attendableId} classNames='contents'>
      <FeatureSection subject={feature} attendableId={attendableId} />
    </AttendableContainer>
  );
};

const meta = {
  title: 'plugins/plugin-code/containers/FeatureSection',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
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
  args: { attendableId: 'test' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The block id, the form over the feature's fields and requirements, and the features it depends on. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByDisplayValue(FEATURE_NAME, undefined, { timeout: 10_000 })).toBeInTheDocument();
    await expect(canvas.getByTestId('feature-section.block-id').textContent).toMatch(/F-3/);
    const dependencies = within(
      await canvas.findByTestId('feature-section.dependencies', undefined, { timeout: 10_000 }),
    );
    await expect(await dependencies.findByText('OAuth tokens')).toBeInTheDocument();
  },
};
