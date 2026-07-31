//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Instructions, Routine, Trigger } from '@dxos/compute';
import { Filter, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type Space } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Card } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';

import { makeRoutine } from '../../util';
import { RoutineCard } from './RoutineCard';

const types = [Routine.Routine, Instructions.Instructions, Trigger.Trigger, Text.Text];

const DefaultStory = () => {
  const { space } = useClientStory();
  const [routine] = useQuery(space?.db, Filter.type(Routine.Routine));
  if (!space || !routine) {
    return <Loading />;
  }

  // The surface host supplies Card.Root and the header; RoutineCard emits only the body.
  return (
    <Card.Root fullWidth>
      <Card.Header>
        <Card.Title>{routine.name ?? 'Untitled'}</Card.Title>
      </Card.Header>
      <RoutineCard subject={routine} />
    </Card.Root>
  );
};

const withSeededRoutine = ({ name, spec, enabled }: { name?: string; spec?: Trigger.Spec; enabled?: boolean } = {}) =>
  withClientProvider({
    createIdentity: true,
    createSpace: true,
    types,
    onCreateSpace: async ({ space }: { space: Space }) => {
      space.db.add(
        makeRoutine({
          name,
          instructions: Instructions.make({ text: 'Summarize the day.' }),
          trigger: Trigger.make({ spec, enabled }),
        }),
      );
    },
  });

const meta = {
  title: 'plugins/plugin-routine/components/RoutineCard',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** An active scheduled routine: the schedule summary, with the green check marking it switched on. */
export const Default: Story = {
  decorators: [withSeededRoutine({ name: 'Daily Digest', spec: Trigger.specTimer('0 9 * * *'), enabled: true })],
};

/** The same routine switched off: same summary, no check. */
export const Inactive: Story = {
  decorators: [withSeededRoutine({ name: 'Daily Digest', spec: Trigger.specTimer('0 9 * * *') })],
};

/** A non-timer trigger has no parameters worth summarizing, so the kind description stands in. */
export const QueryTrigger: Story = {
  decorators: [
    withSeededRoutine({
      name: 'Watch tasks',
      spec: Trigger.specSubscription(Query.select(Filter.type(Text.Text))),
      enabled: true,
    }),
  ],
};

/** A freshly created (blank-template) routine: the body prompts for a trigger. */
export const NoTrigger: Story = {
  decorators: [withSeededRoutine()],
};
