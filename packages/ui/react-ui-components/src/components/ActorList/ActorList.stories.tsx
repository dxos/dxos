//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment, useState } from 'react';

import { type Database, Filter, Obj } from '@dxos/echo';
import { random } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Person } from '@dxos/types';

import { translations } from '#translations';

import { ActorList, type ActorListProps } from './ActorList';

const generator: ValueGenerator = random as any;

random.seed(7);

/**
 * Generate Person objects into the space. The generator does not populate array fields, so derive
 * email addresses from each person's name (every other person gets a second work alias so the
 * email-mode picker shows multiple entries per person).
 */
const generatePeople = async (db: Database.Database, count: number) => {
  const people = await createObjectFactory(db, generator)([{ type: Person.Person, count }]);
  people.forEach((person, index) => {
    Obj.update(person, (person: Obj.Mutable<Person.Person>) => {
      const slug = (person.fullName ?? 'user')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '');
      person.emails = [
        { value: `${slug}@example.com` },
        ...(index % 2 === 0 ? [{ label: 'work', value: `${slug}@work.example.com` }] : []),
      ];
    });
  });
  return people;
};

/**
 * Dense reference grid of the generated people and their email addresses.
 */
const PeopleGrid = ({ db }: { db?: Database.Database }) => {
  const people = useQuery(db, Filter.type(Person.Person));
  return (
    <div className='grid grid-cols-[max-content_1fr] gap-x-4 text-xs text-description'>
      {people.flatMap((person) =>
        (person.emails ?? []).map(({ value }) => (
          <Fragment key={`${person.id}-${value}`}>
            <span className='truncate'>{person.fullName}</span>
            <span className='truncate'>{value}</span>
          </Fragment>
        )),
      )}
    </div>
  );
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
        <PeopleGrid db={space?.db} />
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

export const EmailMode: Story = {
  args: {
    autoFocus: true,
    mode: 'email',
    activateOnTyping: true,
  },
};

export const WithEmail: Story = {
  args: {
    value: 'someone@example.com ',
  },
};
