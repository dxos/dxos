//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { random } from '@dxos/random';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Person } from '@dxos/types';

import { translations } from '#translations';

import { ActorList, type ActorListProps } from './ActorList';

const generator = random as any as ValueGenerator;

random.seed(7);

/**
 * Generate Person objects into the space. The generator does not populate array fields, so derive
 * an email address from each person's name (the typeahead matches names AND emails).
 */
const generatePeople = async (db: Database.Database, count: number) => {
  const people = await createObjectFactory(db, generator)([{ type: Person.Person, count }]);
  people.forEach((person) => {
    Obj.update(person, (person: Obj.Mutable<Person.Person>) => {
      const slug = (person.fullName ?? 'user').toLowerCase().replace(/[^a-z0-9]+/g, '.');
      person.emails = [{ value: `${slug}@example.com` }];
    });
  });
  return people;
};

const meta = {
  title: 'ui/react-ui-components/ActorList',
  component: ActorList,
  render: (args: ActorListProps) => {
    const { space } = useClientStory();
    const [value, setValue] = useState(args.value ?? '');

    return (
      <div className='flex flex-col gap-2'>
        <ActorList
          {...args}
          classNames='p-2 border border-subdued-separator rounded-xs'
          db={space?.db}
          onChange={setValue}
        />

        <JsonHighlighter data={{ value }} classNames='text-xs' />
      </div>
    );
  },
  decorators: [
    withTheme(),
    withLayout({ layout: 'column', classNames: 'p-2', scroll: true }),
    withClientProvider({
      types: [Person.Person],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        await generatePeople(space.db, 8);
      },
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ActorList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    autoFocus: true,
  },
};

export const ActivateOnTyping: Story = {
  args: {
    autoFocus: true,
    activateOnTyping: true,
  },
};

export const WithEmail: Story = {
  args: {
    value: 'someone@example.com ',
  },
};
