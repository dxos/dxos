//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Routine } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { RoutineProperties } from './RoutineProperties';

const DefaultStory = () => {
  const { space } = useClientStory();
  const [routine] = useQuery(space?.db, Filter.type(Routine.Routine));
  if (!routine) {
    return <Loading />;
  }

  return <RoutineProperties routine={routine} />;
};

const meta = {
  title: 'plugins/plugin-assistant/components/RoutineProperties',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Routine.Routine],
      onCreateSpace: async ({ space }) => {
        space.db.add(
          Routine.make({
            name: 'Summarize',
            description: 'Summarize the selected object.',
            instructions: 'Create a new markdown document that is a summary of the selected object.',
          }),
        );
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
