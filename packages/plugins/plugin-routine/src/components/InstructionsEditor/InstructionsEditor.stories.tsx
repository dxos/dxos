//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Instructions, Skill } from '@dxos/compute';
import { Filter, Ref } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
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

/** A routine with no skills or context objects: the form shows empty add affordances. */
export const Default: Story = {
  decorators: [
    withSeededSpace((space) => {
      space.db.add(Instructions.make({ name: 'Summarize notes' }));
    }),
  ],
};

/** A routine seeded with a context object: the Objects field renders the populated ref slot. */
export const WithObject: Story = {
  decorators: [
    withSeededSpace((space) => {
      const subject = space.db.add(Text.make({ content: 'Meeting notes' }));
      space.db.add(Instructions.make({ name: 'Summarize notes', objects: [Ref.make(subject)] }));
    }),
  ],
};
