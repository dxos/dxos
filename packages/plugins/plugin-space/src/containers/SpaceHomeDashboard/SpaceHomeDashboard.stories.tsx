//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { SpaceHomeDashboard, type SpaceStatId } from './SpaceHomeDashboard';

class Task extends Type.makeObject<Task>(DXN.make('org.dxos.type.test.task', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
  }).pipe(LabelAnnotation.set(['name']), Annotation.IconAnnotation.set({ icon: 'ph--check-square--regular' })),
) {}

class Note extends Type.makeObject<Note>(DXN.make('org.dxos.type.test.note', '0.1.0'))(
  Schema.Struct({
    content: Schema.optional(Schema.String),
  }).pipe(LabelAnnotation.set(['content']), Annotation.IconAnnotation.set({ icon: 'ph--note--regular' })),
) {}

const OBJECT_COUNT = 24;

type StoryArgs = {
  stats?: readonly SpaceStatId[];
};

const DefaultStory = ({ stats }: StoryArgs) => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  if (!space) {
    return <Loading />;
  }

  return <SpaceHomeDashboard space={space} stats={stats} />;
};

const meta = {
  title: 'plugins/plugin-space/containers/SpaceHomeDashboard',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen', classNames: 'p-4' }),
    withPluginManager({
      capabilities: [Capability.provide(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [Task, Note],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());

              for (let i = 0; i < OBJECT_COUNT; i++) {
                space.db.add(
                  i % 2 === 0
                    ? Obj.make(Task, { name: `Task ${i + 1}` })
                    : Obj.make(Note, { content: `Note ${i + 1}` }),
                );
              }
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Subset of stat cards via the `stats` prop; the default renders all. */
export const Subset: Story = {
  args: {
    stats: ['objects', 'members'],
  },
};
