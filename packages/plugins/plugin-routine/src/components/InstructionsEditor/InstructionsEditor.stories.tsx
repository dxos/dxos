//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import { Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type Space } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';

import { InstructionsEditor } from './InstructionsEditor';

const types = [Instructions.Instructions, Skill.Skill, Text.Text];

const DefaultStory = () => {
  const { space } = useClientStory();
  const [instructions] = useQuery(space?.db, Filter.type(Instructions.Instructions));
  if (!space || !instructions) {
    return <Loading />;
  }

  return <InstructionsEditor db={space.db} instructions={instructions} />;
};

const withSeededSpace = (seed: (space: Space) => void) =>
  withClientProvider({
    createIdentity: true,
    createSpace: true,
    types,
    onCreateSpace: async ({ space }) => seed(space),
  });

const meta = {
  title: 'plugins/plugin-routine/components/InstructionsEditor',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A routine with no skills: the form shows an empty add affordance. */
export const Default: Story = {
  decorators: [
    withSeededSpace((space) => {
      space.db.add(Instructions.make({ name: 'Summarize notes' }));
    }),
  ],
};

/** A routine seeded with a skill: the Skills field renders the populated ref slot. */
export const WithSkill: Story = {
  decorators: [
    withSeededSpace((space) => {
      const skill = space.db.add(Skill.make({ key: 'org.dxos.test.summarize', name: 'Summarize' }));
      space.db.add(Instructions.make({ name: 'Summarize notes', skills: [Ref.make(skill)] }));
    }),
  ],
};
