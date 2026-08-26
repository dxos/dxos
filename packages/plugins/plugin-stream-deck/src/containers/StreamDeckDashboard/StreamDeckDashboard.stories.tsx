//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Annotation, DXN, Obj, Ref, Tag, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FAVORITE_TAG } from '@dxos/plugin-space/dashboard';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { StreamDeckDashboard } from './StreamDeckDashboard';

/** Story-local type so the keys exercise real label and icon annotations. */
class StoryItem extends Type.makeObject<StoryItem>(DXN.make('org.dxos.type.test.streamDeckStoryItem', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--note--regular', hue: 'cyan' }),
  ),
) {}

const seed = async (space: Space) => {
  const tag = await Tag.findOrCreate(space.db, { label: FAVORITE_TAG });
  const tagRef = Ref.make(tag);
  for (const name of ['Inbox', 'Roadmap', 'Weekly team notes', 'Contacts']) {
    space.db.add(Obj.make(StoryItem, { name, [Obj.Meta]: { tags: [tagRef] } }));
  }
  space.db.add(Obj.make(StoryItem, { name: 'Not a favorite' }));
  await space.db.flush({ indexes: true });
};

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  return space ? <StreamDeckDashboard space={space} attendableId='story' role='deck-companion' /> : <div />;
};

const meta = {
  title: 'plugins/plugin-stream-deck/StreamDeckDashboard',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [StoryItem, Tag.Tag],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              yield* Effect.promise(() => seed(space));
            }),
        }),
        StorybookPlugin.make({}),
      ],
    }),
    withLayout({ layout: 'fullscreen' }),
  ],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
