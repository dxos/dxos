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
import { FeatureSeed } from '@dxos/plugin-projects/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';
import { Feature } from '#types';

import { FeatureArticle } from './FeatureArticle.tsx';

const FEATURE_NAME = 'Provider sync';

type StoryArgs = { role: string; attendableId: string };

const DefaultStory = ({ role, attendableId }: StoryArgs) => {
  const [space] = useSpaces();
  const features = useQuery(space?.db, Filter.type(Feature.Feature));
  const feature = features.find((feature) => feature.name === FEATURE_NAME);
  if (!feature) {
    return <Loading data={{ db: !!space?.db, feature: !!feature }} />;
  }

  return (
    <AttendableContainer id={attendableId} classNames='contents'>
      <FeatureArticle role={role} subject={feature} attendableId={attendableId} />
    </AttendableContainer>
  );
};

const meta = {
  title: 'plugins/plugin-projects/containers/FeatureArticle',
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
    translations: [...translations, ...reactUiTranslations, ...formTranslations],
  },
  args: { role: 'article', attendableId: 'test' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The form over the feature's fields, then its dependencies, dependents, subfeatures, tasks and showcases. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByDisplayValue(FEATURE_NAME, undefined, { timeout: 10_000 })).toBeInTheDocument();
    const relations = within(await canvas.findByTestId('feature-article.relations', undefined, { timeout: 10_000 }));
    await expect(await relations.findByText('OAuth tokens')).toBeInTheDocument();
    await expect(relations.getByText('Compose & send')).toBeInTheDocument();
    await expect(relations.getByText('Move sync to EDGE')).toBeInTheDocument();
    await expect(relations.getByText('First sync of a Gmail inbox')).toBeInTheDocument();
  },
};
