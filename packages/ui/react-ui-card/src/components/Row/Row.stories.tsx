//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, {
  type PropsWithChildren,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { Card, DX_ANCHOR_ACTIVATE, DxAnchorActivate, Icon, Popover } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Actor, Person } from '@dxos/types';

import { translations } from '#translations';

import { Row } from './Row.tsx';

const KNOWN_ACTOR: Actor.Actor = {
  name: 'Alice Avery',
  email: 'alice@example.com',
};

/** No contact resolves for this address, so its avatar offers to create one. */
const UNKNOWN_ACTOR: Actor.Actor = {
  name: 'Bob Bell',
  email: 'bob@example.com',
};

/** Stand-in contact id; the row only needs something `EID`-shaped to anchor a card on. */
const KNOWN_CONTACT = EID.make({
  entityId: '01KZW3HK5M8PKKN708M4J7YJC9',
});

/**
 * Answers the card request `Row.Person` dispatches when an avatar with a resolved contact is hovered.
 *
 * `DxAnchorActivate` does NOT bubble, so a host has to listen in the CAPTURE phase — which is how the
 * app's own host (PreviewPlugin, on `window`) receives it. Written out here rather than imported so
 * this package's story stays free of the editor/plugin layers, and so the contract the row depends on
 * is visible in one place.
 */
const CardPreviewHost = ({ children }: PropsWithChildren) => {
  // Typed as the popover's trigger element: `Popover.VirtualTrigger` declares a button ref because
  // Radix's `Anchor` wants a non-null `Measurable`, though a virtual trigger is only ever measured.
  // `EditorPreviewProvider` carries the same cast; widening it upstream is a follow-up.
  const triggerRef = useRef<HTMLElement | null>(null);
  const [link, setLink] = useState<{ dxn: string; label: string; title?: string }>();
  const [open, setOpen] = useState(false);

  const handleActivate = useCallback((event: Event) => {
    if (!(event instanceof DxAnchorActivate)) {
      return;
    }

    triggerRef.current = event.trigger;
    setLink({ dxn: event.dxn, label: event.label, title: event.title });
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener(DX_ANCHOR_ACTIVATE, handleActivate, true);
    return () => window.removeEventListener(DX_ANCHOR_ACTIVATE, handleActivate, true);
  }, [handleActivate]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.VirtualTrigger virtualRef={triggerRef as RefObject<HTMLButtonElement>} />
      {children}
      {link && (
        <Popover.Portal>
          <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
            <Popover.Viewport classNames='dx-card-popover-width'>
              <Card.Root border={false} data-testid='contact-preview'>
                <Card.Header>
                  <Card.Block>
                    <Icon icon='ph--user--regular' />
                  </Card.Block>
                  <Card.Title>{link.title ?? link.label}</Card.Title>
                </Card.Header>
                <Card.Row>
                  <Card.Text variant='description'>{link.dxn}</Card.Text>
                </Card.Row>
              </Card.Root>
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
};

// Exercises each shared Card-row primitive inside the borderless Card chrome the tiles/headers use.
const DefaultStory = () => {
  const object = useMemo(() => Obj.make(Person.Person, { fullName: 'Casey Contact' }), []);
  // A second stand-in object so the two attachment refs below have distinct URIs (and React keys).
  const secondObject = useMemo(() => Obj.make(Person.Person, { fullName: 'Dana Reference' }), []);

  // Which addresses have a contact. `getContact` is the list-friendly form of the lookup (no ECHO
  // query per row), which is also what lets this package demo the mechanism without a client.
  const [contacts, setContacts] = useState<ReadonlyMap<string, EID.EID>>(() => {
    // `Actor.email` is optional, so the seed is conditional rather than asserted.
    const seeded: [string, EID.EID][] = KNOWN_ACTOR.email ? [[KNOWN_ACTOR.email, KNOWN_CONTACT]] : [];
    return new Map(seeded);
  });
  const getContact = useCallback(
    (actor: Actor.Actor) => (actor.email ? contacts.get(actor.email) : undefined),
    [contacts],
  );
  const handleContactCreate = useCallback(
    (actor: Actor.Actor) =>
      setContacts((current) => (actor.email ? new Map(current).set(actor.email, KNOWN_CONTACT) : current)),
    [],
  );

  // `Row.Star` is controlled, so the story owns the state — without it the toggle renders but never moves.
  const [starred, setStarred] = useState(true);
  const handleToggleStar = useCallback(() => setStarred((current) => !current), []);

  return (
    <CardPreviewHost>
      <Card.Root border={false} fullWidth classNames='p-1'>
        <Card.Body>
          <Card.Row>
            <Card.Block>
              <Row.Star starred={starred} onToggle={handleToggleStar} />
            </Card.Block>
            <Card.Text classNames='text-lg line-clamp-2'>Quarterly planning sync</Card.Text>
          </Card.Row>
          {/* Neither `db` nor `getContact`: no contact resolution, so the avatar is inert. */}
          <Row.Person actor={KNOWN_ACTOR} role='from' />
          {/* The interactive avatar's two states, at both sizes in use: 6 for a dense list row, 9 for
              a message tile's own header. A resolved contact opens its card on hover; an unresolved one
              offers to create the contact (a click, never the hover). */}
          <Row.Person
            actor={KNOWN_ACTOR}
            role='from'
            getContact={getContact}
            size={6}
            onContactCreate={handleContactCreate}
          />
          <Row.Person
            actor={UNKNOWN_ACTOR}
            role='to'
            getContact={getContact}
            size={6}
            onContactCreate={handleContactCreate}
          />
          <Row.Date start={new Date('2025-11-19T12:00:00')} end={new Date('2025-11-19T13:30:00')} />
          <Row.Ref object={object} />
          <Row.Attachments
            attachments={[
              { name: 'invoice.pdf', ref: Ref.make(object) },
              { name: 'photo.png', ref: Ref.make(secondObject) },
            ]}
          />
          <Row.Tags
            tags={[
              { id: 'a', label: 'travel', hue: 'cyan' },
              { id: 'b', label: 'urgent', hue: 'rose' },
            ]}
            onTagClick={() => {}}
          />
        </Card.Body>
      </Card.Root>
    </CardPreviewHost>
  );
};

const meta = {
  title: 'ui/react-ui-card/Row',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The avatar's two hover states — the core mechanism every person surface inherits. */
export const Spec: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const avatarFor = (name: string) => {
      const rows = [...canvasElement.querySelectorAll('.dx-card__row')].filter((row) =>
        row.textContent?.includes(name),
      );
      // The first row for the known actor is the inert variant; the interactive one carries the testid.
      const avatar = rows.map((row) => row.querySelector('[data-testid="row.contact-avatar"]')).find(Boolean);
      if (!avatar) {
        throw new Error(`Interactive avatar not found for ${name}.`);
      }
      return avatar;
    };

    // Both sizes render a row per actor, so the name is deliberately not unique.
    await waitFor(() => expect(canvas.getAllByText('Bob Bell').length).toBeGreaterThan(0), { timeout: 12_000 });

    // Resolved contact → hovering opens its card (rendered in a portal, so queried from the document).
    await userEvent.hover(avatarFor('Alice Avery'));
    const card = await waitFor(
      () => {
        const found = document.body.querySelector('[data-testid="contact-preview"]');
        if (!found) {
          throw new Error('Contact card did not open.');
        }
        return found;
      },
      { timeout: 5_000 },
    );
    await expect(card).toHaveTextContent('Alice Avery');
    await userEvent.keyboard('{Escape}');

    // No contact → the avatar gives way to a create button, and creating one flips the row's state.
    // Mounted for keyboard access but faded until hover/focus, so opacity is what this asserts.
    const created = canvas.getAllByRole('button', { name: 'Create contact' });
    await expect(created.length).toBeGreaterThan(0);
    await userEvent.hover(avatarFor('Bob Bell'));
    const create = await canvas.findAllByRole('button', { name: 'Create contact' }, { timeout: 5_000 });
    await userEvent.click(create[0]);
    await waitFor(() => expect(canvas.queryAllByRole('button', { name: 'Create contact' })).toHaveLength(0), {
      timeout: 5_000,
    });
  },
};
