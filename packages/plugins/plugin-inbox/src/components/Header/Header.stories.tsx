//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Obj } from '@dxos/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Card } from '@dxos/react-ui';
import { Row } from '@dxos/react-ui-card';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { type Actor, Person } from '@dxos/types';

import { ContactPreview, useContactCreate } from '#testing';
import { translations } from '#translations';

import { Header } from './Header';

/** An actor with a known address, so `contacts` can name one without a non-null assertion. */
type StoryActor = Actor.Actor & { email: string };

const KNOWN_SENDER: StoryActor = {
  name: 'Alice Avery',
  email: 'alice@example.com',
};

/** Second actor, used by the variant that needs an address the space has no Person for. */
const UNKNOWN_SENDER: StoryActor = {
  name: 'Bob Bell',
  email: 'bob@example.com',
};

type StoryArgs = {
  /** Person rows to render, in order; the first is the sender. */
  actors?: StoryActor[];
  /** Emails to seed a Person for — an actor NOT listed here exercises the create-contact affordance. */
  contacts?: string[];
};

/**
 * Header.Root chrome composing shared Row.* primitives — the structure both article headers use.
 *
 * Live rather than static: the star owns its state, and each avatar resolves its actor's contact, so
 * hovering one opens that Person's card (or offers to create the Person when the space has none —
 * always a click, never the hover).
 */
const DefaultStory = ({ actors = [KNOWN_SENDER] }: StoryArgs) => {
  const { space } = useClientStory();
  const [starred, setStarred] = useState(true);
  const handleContactCreate = useContactCreate(space?.db);

  return (
    <ContactPreview db={space?.db}>
      <Header.Root>
        <Card.Row>
          <Card.Block>
            <Row.Star starred={starred} onToggle={() => setStarred((value) => !value)} />
          </Card.Block>
          <Card.Text classNames='text-lg line-clamp-2'>Quarterly planning sync</Card.Text>
        </Card.Row>
        {actors.map((actor, index) => (
          <Row.Person
            key={actor.email}
            actor={actor}
            role={index === 0 ? 'from' : 'to'}
            db={space?.db}
            onContactCreate={handleContactCreate}
          />
        ))}
        <Row.Date start={new Date('2025-11-19T12:00:00')} end={new Date('2025-11-19T13:00:00')} />
        <Row.Tags tags={[{ id: 'a', label: 'planning', hue: 'cyan' }]} />
      </Header.Root>
    </ContactPreview>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/Header',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      types: [Person.Person],
      createIdentity: true,
      createSpace: true,
      // Seeds a Person per `contacts` entry, so which rows have a contact is an arg rather than a
      // separate story component.
      onCreateSpace: ({ space }, context) => {
        const args: StoryArgs = context.args ?? {};
        const { actors = [KNOWN_SENDER], contacts = [] } = args;
        for (const email of contacts) {
          const actor = actors.find((candidate) => candidate.email === email);
          space.db.add(Obj.make(Person.Person, { fullName: actor?.name, emails: [{ value: email }] }));
        }
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...reactUiTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    actors: [KNOWN_SENDER],
    contacts: [KNOWN_SENDER.email],
  },
};

/** No seeded contact, so hovering the avatar offers to create the Person. */
export const UnknownSender: Story = {
  args: {
    actors: [UNKNOWN_SENDER],
    contacts: [],
  },
};

/**
 * Both avatar hover states side by side: `SENDER` has a Person (card on hover), `STRANGER` has none
 * (create-contact button on hover, and creating it hands over to the card).
 */
export const Spec: Story = {
  args: {
    actors: [KNOWN_SENDER, UNKNOWN_SENDER],
    contacts: [KNOWN_SENDER.email],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('Bob Bell')).toBeInTheDocument(), { timeout: 12_000 });

    const avatarFor = (name: string) => {
      const avatar = canvas
        .getByText(name)
        .closest('.dx-card__row')
        ?.querySelector('[data-testid="row.contact-avatar"]');
      if (!avatar) {
        throw new Error(`Contact avatar not found for ${name}.`);
      }
      return avatar;
    };

    // The actor WITH a Person: hovering the avatar opens that contact's card. The popover renders in a
    // portal outside the canvas, so it is queried from the document rather than `canvas`.
    await userEvent.hover(avatarFor('Alice Avery'));
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
    await expect(card).toHaveTextContent('Alice Avery');
    await expect(card).toHaveTextContent('alice@example.com');
    await userEvent.keyboard('{Escape}');

    // The actor WITHOUT one: no create button until hovered, then a click creates the Person and the
    // row goes back to showing an avatar (now card-backed).
    // Mounted for keyboard access, faded until hover/focus (see `ContactAvatar`).
    await expect(canvas.getAllByRole('button', { name: 'Create contact' }).length).toBeGreaterThan(0);
    await userEvent.hover(avatarFor('Bob Bell'));
    const create = await canvas.findByRole('button', { name: 'Create contact' }, { timeout: 5_000 });
    await userEvent.click(create);
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Create contact' })).toBeNull(), {
      timeout: 5_000,
    });

    await userEvent.click(await canvas.findByRole('button', { name: 'Unstar' }, { timeout: 5_000 }));
    await canvas.findByRole('button', { name: 'Star' }, { timeout: 5_000 });
  },
};
