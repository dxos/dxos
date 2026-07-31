//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment, useMemo } from 'react';

import { type Database, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { random } from '@dxos/random';
import { createObject } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Event as EventType, Person } from '@dxos/types';

import { translations } from '#translations';

import { Event } from './Event';

const generator: ValueGenerator = random as any;

random.seed(7);

/**
 * Generate Person objects into the space (for the attendee typeahead). The generator does not
 * populate array fields, so derive an email address from each person's name.
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
    <div className='grid grid-cols-[max-content_1fr] gap-x-4 p-2 text-xs text-description'>
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

// `createObject` yields a live, reactive ECHO object so the editable inputs (useObject) and the
// markdown body editor (Doc.createAccessor) work in the story; the client space provides the
// Person registry backing the attendee typeahead.
const DefaultStory = ({ editable }: { editable?: boolean }) => {
  const { space } = useClientStory();
  const event = useMemo(
    () =>
      createObject(
        EventType.make({
          title: random.lorem.sentence(5),
          description: random.lorem.paragraph(1),
          owner: {},
          startDate: new Date('2025-11-19T12:00:00').toISOString(),
          endDate: new Date('2025-11-19T13:00:00').toISOString(),
          attendees: Array.from({ length: 3 }, () => ({
            name: random.person.fullName(),
            email: random.internet.email(),
          })),
        }),
      ),
    [],
  );

  return (
    <Event.Root event={event}>
      <Event.Toolbar alwaysActive onSave={editable ? () => {} : undefined} onDelete={editable ? () => {} : undefined} />
      <Event.Header db={space?.db} editable={editable} />
      <Event.Viewport>
        <Event.Body editable={editable} />
      </Event.Viewport>
      <PeopleGrid db={space?.db} />
    </Event.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/Event',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
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
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Editable: Story = {
  args: {
    editable: true,
  },
};
