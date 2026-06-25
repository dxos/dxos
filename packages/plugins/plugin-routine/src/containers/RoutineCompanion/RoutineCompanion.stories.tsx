//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Instructions, Skill } from '@dxos/compute';
import { Filter, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Routine } from '#types';

import { RoutineCompanion } from './RoutineCompanion';

const types = [Routine.Routine, Instructions.Instructions, Skill.Skill, Text.Text];

/** Seed a companion-subject object plus one automation connected via instructions.objects. */
const seed = (space: Space) => {
  const subject = space.db.add(Text.make({ content: 'Meeting notes' }));

  space.db.add(
    Routine.make({
      name: 'Summarize Notes',
      instructions: Instructions.make({ name: 'Summarize notes', objects: [Ref.make(subject)] }),
    }),
  );
};

const withCompanion = () =>
  withPluginManager({
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* Effect.promise(() => client.halo.createIdentity());
            const space = yield* Effect.promise(() => client.spaces.create());
            yield* Effect.promise(() => space.waitUntilReady());
            seed(space);
          }),
      }),
      RoutinePlugin(),
    ],
  });

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [subject] = useQuery(space?.db, Filter.type(Text.Text));
  if (!subject || !space?.db) {
    return <Loading />;
  }
  return <RoutineCompanion attendableId={subject.id} subject={subject} />;
};

const meta = {
  title: 'plugins/plugin-routine/containers/RoutineCompanion',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withCompanion()],
};
