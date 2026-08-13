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

const SENDER: Actor.Actor = {
  name: 'Alice Avery',
  email: 'alice@example.com',
};

/** Second actor, deliberately without a Person record, so the create affordance has somewhere to appear. */
const STRANGER: Actor.Actor = {
  name: 'Bob Bell',
  email: 'bob@example.com',
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

type StoryArgs = {
  sender: Actor.Actor;
};

// Header.Root chrome composing shared Row.* primitives — the structure both article headers use.
// Star and avatar are live: the star owns its state, and the avatar resolves the actor's contact (so
// it opens a card on hover, or offers to create the Person when the space has none).
const DefaultStory = () => {
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
      <Row.Person avatar actor={SENDER} role='from' db={space?.db} onContactCreate={handleContactCreate} />
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
      onCreateSpace: ({ space }) => {
        // SENDER has a contact (card on hover); STRANGER deliberately does not (create affordance).
        space.db.add(Obj.make(Person.Person, { fullName: SENDER.name, emails: [{ value: SENDER.email! }] }));
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // `Row.Star` labels itself from react-ui's own translation namespace, which this isolated story
    // does not load — so the accessible name is the raw key. Asserting on it still pins the behaviour
    // under test: the star owns its state, and toggling swaps which action the button offers.
    const unstar = await canvas.findByRole('button', { name: 'system-button.unstar.label' }, { timeout: 12_000 });
    await userEvent.click(unstar);
    await canvas.findByRole('button', { name: 'system-button.star.label' }, undefined, { timeout: 5_000 });
  },
};

export const UnknownSender: Story = {};

export const KnownSender: Story = {};

/**
 * The avatar's two hover states, which are what the sender gutter is for:
 *
 *  - the actor HAS a Person → hovering the avatar opens that contact's card;
 *  - the actor has none → the avatar gives way to a create-contact button (a click, never the hover,
 *    since hovering must not write to the space).
 *
 * `onContactCreate` runs the extractor's own `buildContactFromActor` — the same core the app reaches
 * through `InboxOperation.ExtractContact` — so creating the contact here flips the row into its
 * card-on-hover state exactly as it does in the app.
 */
const ContactStory = () => {
  const { space } = useClientStory();
  const handleContactCreate = useContactCreate(space);

  return (
    <Header.Root>
      <Card.Row>
        <Card.Block>
          <Row.Star starred onToggle={() => {}} />
        </Card.Block>
        <Card.Text classNames='text-lg line-clamp-2'>Quarterly planning sync</Card.Text>
      </Card.Row>
      {/* `avatar` + `db` is the interactive variant: it resolves the contact, so it can hover. */}
      <Row.Person avatar actor={SENDER} role='from' db={space?.db} onContactCreate={handleContactCreate} />
      <Row.Person avatar actor={STRANGER} role='to' db={space?.db} onContactCreate={handleContactCreate} />
    </Header.Root>
  );
};

export const Contact: Story = {
  render: ContactStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('Bob Bell')).toBeInTheDocument(), { timeout: 12_000 });

    // The actor WITH a Person: hovering the avatar asks the card surface to open that contact's card.
    // No preview surface is mounted here, so the request itself is what this asserts.
    // Captured on `window`, which is where PreviewPlugin listens: the event does not bubble, so only
    // the capture phase sees it from an element this deep.
    const activations: string[] = [];
    window.addEventListener('dx-anchor-activate', () => activations.push('activated'), true);
    const senderAvatar = canvas
      .getByText('Alice Avery')
      .closest('.dx-card__row')
      ?.querySelector('[data-testid="row.contact-avatar"]');
    if (!senderAvatar) {
      throw new Error('Contact avatar not found for the actor with a contact.');
    }
    await userEvent.hover(senderAvatar);
    await waitFor(() => expect(activations).toHaveLength(1), { timeout: 5_000 });
    await userEvent.unhover(senderAvatar);

    // Neither row shows a create button until hovered.
    await expect(canvas.queryByRole('button', { name: 'Create contact' })).toBeNull();

    // Hovering the contactless actor's avatar offers to create the Person. The hover target is the
    // avatar in the row's gutter, not the row's text cell.
    const strangerAvatar = canvas
      .getByText('Bob Bell')
      .closest('.dx-card__row')
      ?.querySelector('[data-testid="row.contact-avatar"]');
    if (!strangerAvatar) {
      throw new Error('Contact avatar not found for the contactless actor.');
    }
    await userEvent.hover(strangerAvatar);
    const create = await canvas.findByRole('button', { name: 'Create contact' }, { timeout: 5_000 });

    // Clicking it creates the contact, and the row goes back to showing an avatar (now card-backed).
    await userEvent.click(create);
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Create contact' })).toBeNull(), {
      timeout: 5_000,
    });
  },
};
