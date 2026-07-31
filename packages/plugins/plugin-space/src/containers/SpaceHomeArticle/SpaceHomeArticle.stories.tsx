//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { useHomeVisibility } from '@dxos/app-toolkit/ui';
import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { SpaceHomeDashboard, SpaceHomeRecent } from '#containers';
import { translations } from '#translations';
import { SpaceHomeContent } from '#types';

import { SpaceHomeArticle } from './SpaceHomeArticle';

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

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  if (!space) {
    return <Loading />;
  }

  return <SpaceHomeArticle role='article' attendableId='story' space={space} />;
};

const meta = {
  title: 'plugins/plugin-space/containers/SpaceHomeArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.contribute(AppCapabilities.Translations, translations),
        // Registered types feed SpaceHomeRecent's type filter (normally via addSchemaModule).
        Capability.contribute(AppCapabilities.Schema, [Task, Note]),
        // Home-content contributors normally wired by the plugin's react-surface capability,
        // including the per-section visibility gate + close affordance.
        Capability.contribute(Capabilities.ReactSurface, [
          Surface.create({
            id: 'story.spaceHomeRecent',
            filter: Surface.makeFilter(SpaceHomeContent),
            component: ({ data }) => {
              const { visible, hide } = useHomeVisibility(data.space, 'spaceHomeRecent');
              return visible ? <SpaceHomeRecent space={data.space} onClose={hide} /> : null;
            },
          }),
          Surface.create({
            id: 'story.spaceHomeDashboard',
            filter: Surface.makeFilter(SpaceHomeContent),
            component: ({ data }) => {
              const { visible, hide } = useHomeVisibility(data.space, 'spaceHomeDashboard');
              return visible ? <SpaceHomeDashboard space={data.space} onClose={hide} /> : null;
            },
          }),
        ]),
      ],
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
