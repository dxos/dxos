//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment, useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { type Database, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { random } from '@dxos/random';
import { createObject } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Event as EventType, Person } from '@dxos/types';

import { ContactPreview, useContactCreate } from '#testing';
import { translations } from '#translations';

import { Event } from './Event.tsx';

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

/**
 * Two fixed attendees pinning both contact states, rather than leaving it to whatever the generator
 * happened to produce: the known one is seeded as a Person (hovering opens their card), the unknown
 * one deliberately is not (hovering offers to create it).
 */
const KNOWN_ATTENDEE = {
  name: 'Alice Avery',
  email: 'alice@example.com',
};

const UNKNOWN_ATTENDEE = {
  name: 'Bob Bell',
  email: 'bob@example.com',
};

// `createObject` yields a live, reactive ECHO object so the editable inputs (useObject) and the
// markdown body editor (Doc.createAccessor) work in the story; the client space provides the
// Person registry backing the attendee typeahead.
const DefaultStory = ({ editable }: { editable?: boolean }) => {
  const { space } = useClientStory();
  const handleContactCreate = useContactCreate(space?.db);
  const event = useMemo(
    () =>
      createObject(
        EventType.make({
          title: random.lorem.sentence(5),
          description: random.lorem.paragraph(1),
          owner: {},
          startDate: new Date('2025-11-19T12:00:00').toISOString(),
          endDate: new Date('2025-11-19T13:00:00').toISOString(),
          attendees: [
            KNOWN_ATTENDEE,
            UNKNOWN_ATTENDEE,
            { name: random.person.fullName(), email: random.internet.email() },
          ],
        }),
      ),
    [],
  );

  return (
    // Hosts the contact card each attendee row asks for on hover (PreviewPlugin's job in the app).
    <ContactPreview db={space?.db}>
      <Event.Root event={event}>
        <Event.Toolbar
          alwaysActive
          onSave={editable ? () => {} : undefined}
          onDelete={editable ? () => {} : undefined}
        />
        <Event.Header db={space?.db} editable={editable} onContactCreate={handleContactCreate} />
        <Event.Viewport>
          <Event.Body editable={editable} />
        </Event.Viewport>
        <PeopleGrid db={space?.db} />
      </Event.Root>
    </ContactPreview>
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
        space.db.add(
          Obj.make(Person.Person, { fullName: KNOWN_ATTENDEE.name, emails: [{ value: KNOWN_ATTENDEE.email }] }),
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

export const Editable: Story = {
  args: {
    editable: true,
  },
};

/** The attendee rows' two contact states, which every `Row.Person` surface shares. */
export const Spec: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Scoped to the header's rows: the story also lists every seeded person in its reference grid,
    // so the name alone is ambiguous.
    const attendeeRow = () =>
      [...canvasElement.querySelectorAll('.dx-card__row')].find((row) =>
        row.textContent?.includes(KNOWN_ATTENDEE.name),
      );
    await waitFor(() => expect(attendeeRow()).toBeTruthy(), { timeout: 12_000 });

    // The known attendee's row resolves to a Person, so hovering its avatar opens the card. The
    // popover renders in a portal outside the canvas, hence the document-level query.
    const avatar = attendeeRow()?.querySelector('[data-testid="row.contact-avatar"]');
    if (!avatar) {
      throw new Error('Contact avatar not found for the known attendee.');
    }
    await userEvent.hover(avatar);
    const card = await waitFor(
      () => {
        const found = document.body.querySelector('[data-testid="contact-preview"]');
        if (!found) {
          throw new Error('Contact preview card did not open.');
        }
        return found;
      },
      { timeout: 5_000 },
    );
    await expect(card).toHaveTextContent(KNOWN_ATTENDEE.name);
    await expect(card).toHaveTextContent(KNOWN_ATTENDEE.email);
    await userEvent.keyboard('{Escape}');

    // The unknown attendee's row offers to create the Person instead — on hover, never before it.
    // Mounted for keyboard access, faded until hover/focus (see `ContactAvatar`).
    await expect(canvas.getAllByRole('button', { name: 'Create contact' }).length).toBeGreaterThan(0);
    const unknownAvatar = [...canvasElement.querySelectorAll('.dx-card__row')]
      .find((row) => row.textContent?.includes(UNKNOWN_ATTENDEE.name))
      ?.querySelector('[data-testid="row.contact-avatar"]');
    if (!unknownAvatar) {
      throw new Error('Contact avatar not found for the unknown attendee.');
    }
    await userEvent.hover(unknownAvatar);
    // Scoped to the hovered row: every contactless attendee mounts its own create button.
    await waitFor(() => expect(unknownAvatar.querySelector('button')).toBeTruthy(), { timeout: 5_000 });
  },
};
