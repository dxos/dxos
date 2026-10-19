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
import * as Card from '@dxos/react-ui/Card';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';
import { Showcase } from '#types';

import { ShowcaseCardContent } from './ShowcaseCardContent.tsx';

const NAME = 'First sync of a Gmail inbox';

/** Framed as the app's card host frames it: the host draws the root and the name, the surface the body. */
const DefaultStory = () => {
  const [space] = useSpaces();
  const objects = useQuery(space?.db, Filter.type(Showcase.Showcase));
  const subject = objects.find((object) => object.name === NAME);
  if (!subject) {
    return <Loading data={{ db: !!space?.db, subject: !!subject }} />;
  }

  return (
    <Card.Root classNames='w-[20rem] m-4'>
      <Card.Header>
        <Card.Title>{subject.name}</Card.Title>
      </Card.Header>
      <ShowcaseCardContent subject={subject} />
    </Card.Root>
  );
};

const meta = {
  title: 'plugins/plugin-projects/containers/ShowcaseCardContent',
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
} satisfies Meta<typeof DefaultStory>;

export default meta;

export const Default: StoryObj<typeof meta> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('What was shown', { exact: false }, { timeout: 10_000 })).toBeInTheDocument();
  },
};
