//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { buildContactFromActor } from '@dxos/extractor-lib';
import { type Space } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Card } from '@dxos/react-ui';
import { Row } from '@dxos/react-ui-card';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Actor, Person } from '@dxos/types';

import { translations } from '#translations';

import { Header } from './Header';

/** An actor with a known address, so `contacts` can name one without a non-null assertion. */
type StoryActor = Actor.Actor & { email: string };

const KNOWN_SENDER: StoryActor = {
  name: 'Alice Avery',
  email: 'alice@example.com',
};

/** Second actor, used by the variant that needs an address the space has no Person for. */
const STRANGER: StoryActor = {
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
 * Creates the contact for an actor with the extractor's own `buildContactFromActor` — the same core
 * the app reaches through `InboxOperation.ExtractContact`, so the row flips into its card-on-hover
 * state here exactly as it does in the app.
 */
const useContactCreate = (space?: Space) =>
  useCallback(
    (actor: Actor.Actor) => {
      if (!space) {
        return;
      }
      void EffectEx.runPromise(buildContactFromActor(actor, space.db)).then((contact) => {
        if (contact) {
          space.db.add(contact);
        }
      });
    },
    [space],
  );

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
  const handleContactCreate = useContactCreate(space);

  return (
    <Header.Root>
      <Card.Row>
        <Card.Block>
          <Row.Star starred={starred} onToggle={() => setStarred((value) => !value)} />
        </Card.Block>
        <Card.Text classNames='text-lg line-clamp-2'>Quarterly planning sync</Card.Text>
      </Card.Row>
      {actors.map((actor, index) => (
        // `avatar` + `db` is the interactive variant: it resolves the contact, so it can hover.
        <Row.Person
          key={actor.email}
          avatar
          actor={actor}
          role={index === 0 ? 'from' : 'to'}
          db={space?.db}
          onContactCreate={handleContactCreate}
        />
      ))}
      <Row.Date start={new Date('2025-11-19T12:00:00')} end={new Date('2025-11-19T13:00:00')} />
      <Row.Tags tags={[{ id: 'a', label: 'planning', hue: 'cyan' }]} />
    </Header.Root>
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
    translations,
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

export const UnknownSender: Story = {
  args: {
    actors: [STRANGER],
    contacts: [STRANGER.email],
  },
};

/**
 * Both avatar hover states side by side: `SENDER` has a Person (card on hover), `STRANGER` has none
 * (create-contact button on hover, and creating it hands over to the card).
 */
export const Spec: Story = {
  args: {
    actors: [KNOWN_SENDER, STRANGER],
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

    // The actor WITH a Person: hovering the avatar asks the card surface to open that contact's card.
    // Captured on `window`, which is where PreviewPlugin listens: the event does not bubble, so only
    // the capture phase sees it from an element this deep. No preview surface is mounted here, so the
    // request itself is what this asserts.
    const activations: string[] = [];
    window.addEventListener('dx-anchor-activate', () => activations.push('activated'), true);
    await userEvent.hover(avatarFor('Alice Avery'));
    await waitFor(() => expect(activations).toHaveLength(1), { timeout: 5_000 });
    await userEvent.unhover(avatarFor('Alice Avery'));

    // The actor WITHOUT one: no create button until hovered, then a click creates the Person and the
    // row goes back to showing an avatar (now card-backed).
    await expect(canvas.queryByRole('button', { name: 'Create contact' })).toBeNull();
    await userEvent.hover(avatarFor('Bob Bell'));
    const create = await canvas.findByRole('button', { name: 'Create contact' }, { timeout: 5_000 });
    await userEvent.click(create);
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Create contact' })).toBeNull(), {
      timeout: 5_000,
    });

    // `Row.Star` labels itself from react-ui's own translation namespace, which this isolated story
    // does not load — so the accessible name is the raw key. Asserting on it still pins the behaviour
    // under test: the star owns its state, and toggling swaps which action the button offers.
    await userEvent.click(canvas.getByRole('button', { name: 'system-button.unstar.label' }));
    await canvas.findByRole('button', { name: 'system-button.star.label' }, undefined, { timeout: 5_000 });
  },
};
