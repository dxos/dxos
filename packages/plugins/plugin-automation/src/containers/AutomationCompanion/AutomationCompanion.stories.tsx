//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Skill, Routine } from '@dxos/compute';
import { Filter, Obj, Ref, Relation } from '@dxos/echo';
import { AutomationPlugin } from '@dxos/plugin-automation/testing';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Automation } from '#types';

import { AutomationCompanion } from './AutomationCompanion';

const types = [Automation.Automation, Automation.AppliesTo, Routine.Routine, Skill.Skill, Text.Text];

/** Seed a companion-subject object plus one automation anchored to it via an AppliesTo relation. */
const seed = (space: Space) => {
  const subject = space.db.add(Text.make({ content: 'Meeting notes' }));

  const routine = space.db.add(Routine.make({ name: 'Summarize notes', objects: [Ref.make(subject)] }));
  const automation = space.db.add(Automation.make({ name: 'Summarize Notes', triggers: [] }));
  Obj.setParent(routine, automation);
  space.db.add(Automation.makeAppliesTo({ [Relation.Source]: automation, [Relation.Target]: subject }));
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
      AutomationPlugin(),
    ],
  });

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [subject] = useQuery(space?.db, Filter.type(Text.Text));
  if (!subject || !space?.db) {
    return <Loading />;
  }
  return <AutomationCompanion db={space.db} object={subject} />;
};

const meta = {
  title: 'plugins/plugin-automation/containers/AutomationCompanion',
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
