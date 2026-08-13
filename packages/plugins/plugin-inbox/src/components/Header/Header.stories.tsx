//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Filter, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { buildContactFromActor } from '@dxos/extractor-lib';
import { EID } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Card, Icon, Popover } from '@dxos/react-ui';
import { Row } from '@dxos/react-ui-card';
import { EditorPreviewProvider, useEditorPreview } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Actor, Person } from '@dxos/types';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/ui-types';

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
 * Renders the popover the avatar's hover asks for. In Composer this is PreviewPlugin's job (it
 * listens on `window` and dispatches a layout operation); a story stands in for it with
 * `EditorPreviewProvider` plus this content, or hovering would fire an event nothing answers.
 */
const ContactPreviewCard = () => {
  const { target } = useEditorPreview('ContactPreviewCard');
  const contact: Person.Person | undefined = target?.object;
  if (!target) {
    return null;
  }

  return (
    <Popover.Portal>
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport classNames='dx-card-popover-width'>
          <Card.Root border={false} data-testid='contact-preview'>
            <Card.Header>
              <Card.Block>
                <Icon icon='ph--user--regular' />
              </Card.Block>
              <Card.Title>{contact?.fullName ?? target.label}</Card.Title>
            </Card.Header>
            <Card.Row>
              <Card.Text variant='description'>{contact?.emails?.[0]?.value}</Card.Text>
            </Card.Row>
          </Card.Root>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
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
  const handleContactCreate = useContactCreate(space);

  // Resolves the hovered avatar's DXN back to its Person, so the card shows the real contact.
  const handlePreviewLookup = useCallback(
    async ({ dxn, label }: PreviewLinkRef): Promise<PreviewLinkTarget> => {
      const eid = EID.tryParse(dxn);
      const id = eid && EID.getEntityId(eid);
      const object = id && space ? (await space.db.query(Filter.id(id)).run())[0] : undefined;
      return { label, object };
    },
    [space],
  );

  return (
    <EditorPreviewProvider onLookup={handlePreviewLookup}>
      <ContactPreviewCard />
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
    </EditorPreviewProvider>
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
