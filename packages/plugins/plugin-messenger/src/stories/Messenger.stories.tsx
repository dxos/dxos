//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { MemoryEdgeInbox } from '@dxos/client-services/testing';
import { type Space } from '@dxos/client/echo';
import { Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useSpace } from '@dxos/react-client/echo';
import { useContacts, useIdentity } from '@dxos/react-client/halo';
import { useClientStory, withMultiClientProvider } from '@dxos/react-client/testing';
import { Button, Checkbox, Flex, Icon, Input, Panel, Select, Toolbar } from '@dxos/react-ui';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Organization } from '@dxos/types';

import { NotificationsPanel } from '#components';
import { loadLink, makeSender, startInboxMaterializer } from '#materializer';
import { translations } from '#translations';
import { Notifications } from '#types';

/** Stands in for EDGE: both clients' inboxes are routed through it. */
const inboxRelay = new MemoryEdgeInbox();

const LINKED_OBJECT_NAME = 'Q3 planning';

//
// Alice: picks a contact and sends a message, optionally linking an object in the shared space.
//

const AliceColumn = () => {
  const client = useClient();
  const { spaceId } = useClientStory();
  const space = useSpace(spaceId);
  const contacts = useContacts();
  const [linked] = useQuery(space?.db, Filter.type(Organization.Organization));
  const [recipient, setRecipient] = useState<string>();
  const [text, setText] = useState('');
  const [withLink, setWithLink] = useState(true);
  const [status, setStatus] = useState<string>();
  const sender = useMemo(() => makeSender(() => client.halo), [client]);

  const options = useMemo(
    () =>
      contacts.flatMap((contact) =>
        contact.did
          ? [{ value: contact.did, label: contact.profile?.displayName ?? `Bob (${contact.did.slice(-6)})` }]
          : [],
      ),
    [contacts],
  );
  const recipientDid = recipient ?? options[0]?.value;

  const handleSend = useCallback(() => {
    if (!recipientDid || text.length === 0) {
      return;
    }

    const message = Message.make({
      sender: { name: 'Alice' },
      blocks: [{ _tag: 'text', text }],
      attachments: withLink && linked ? [{ name: LINKED_OBJECT_NAME, ref: Ref.make(linked) }] : undefined,
      properties: { subject: 'Review request' },
    });
    setStatus('Sending…');
    void EffectEx.runPromise(sender.send(recipientDid, message)).then(
      () => {
        setText('');
        setStatus('Sent.');
      },
      (error) => setStatus(String(error)),
    );
  }, [sender, recipientDid, text, withLink, linked]);

  return (
    <Panel.Root data-testid='messenger.alice'>
      <Panel.Header>
        <Toolbar.Root>
          <Icon icon='ph--user--regular' />
          <span>Alice</span>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <Flex column gap='md' classNames='p-4'>
          <Select.Root
            items={options}
            value={recipientDid ? [recipientDid] : []}
            onValueChange={({ value }) => setRecipient(value[0])}
          >
            <Select.Trigger placeholder='Recipient' aria-label='Recipient' data-testid='messenger.recipient' />
            <Select.Content>
              {options.map((option) => (
                <Select.Item key={option.value} item={option} />
              ))}
            </Select.Content>
          </Select.Root>
          <Input
            placeholder='Message'
            value={text}
            onChange={(event) => setText(event.target.value)}
            data-testid='messenger.text'
          />
          <Checkbox
            label={`Link “${LINKED_OBJECT_NAME}”`}
            checked={withLink}
            onCheckedChange={({ checked }) => setWithLink(checked === true)}
          />
          <Button
            variant='primary'
            icon='ph--paper-plane-tilt--regular'
            label='Send'
            disabled={!recipientDid || text.length === 0}
            onClick={handleSend}
            data-testid='messenger.send'
          />
          {status && <span className='text-sm text-fg-muted'>{status}</span>}
        </Flex>
      </Panel.Body>
    </Panel.Root>
  );
};

//
// Bob: materializes his inbox into a space of his own and reads it in the panel.
//

const useOwnSpace = (): Space | undefined => {
  const client = useClient();
  const identity = useIdentity();
  const [space, setSpace] = useState<Space>();
  useEffect(() => {
    if (!identity) {
      return;
    }

    let cancelled = false;
    void client.spaces.create({ name: 'Bob' }).then(async (space) => {
      await space.waitUntilReady();
      if (!cancelled) {
        setSpace(space);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [client, identity]);
  return space;
};

const UnreadBadge = ({ notifications }: { notifications: Notifications.Notifications }) => {
  const [readIds] = useObject(notifications, 'readIds');
  const feed = useResolveRef(notifications.feed);
  const messages = useQuery(
    Obj.getDatabase(notifications),
    feed ? Notifications.messagesQuery(feed) : Query.select(Filter.nothing()),
  );
  const unread = Notifications.countUnread(messages, readIds ?? []);
  return unread > 0 ? (
    <span className='rounded-full bg-accent-bg text-accent-fg text-xs px-2' data-testid='messenger.badge'>
      {unread}
    </span>
  ) : null;
};

const BobColumn = () => {
  const client = useClient();
  const space = useOwnSpace();
  const [notifications] = useQuery(space?.db, Filter.type(Notifications.Notifications));
  const [opened, setOpened] = useState<string>();

  useEffect(() => {
    if (!space) {
      return;
    }

    const { stop } = startInboxMaterializer({ client, getSpace: () => space });
    return stop;
  }, [client, space]);

  const handleOpen = useCallback(
    (message: Message.Message) => {
      const ref = message.attachments?.[0]?.ref;
      if (!ref) {
        return;
      }

      void EffectEx.runPromise(loadLink(client, ref)).then(
        (object) => setOpened(Obj.getLabel(object) ?? object.id),
        (error) => log.warn('failed to resolve link', { error }),
      );
    },
    [client],
  );

  return (
    <Panel.Root data-testid='messenger.bob'>
      <Panel.Header>
        <Toolbar.Root>
          <Icon icon='ph--envelope--regular' />
          <span>Bob</span>
          {notifications && <UnreadBadge notifications={notifications} />}
          {opened && <span className='text-sm text-fg-muted'>{`Opened “${opened}”`}</span>}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        {notifications ? (
          <NotificationsPanel notifications={notifications} onOpen={handleOpen} />
        ) : (
          <Flex center classNames='h-full text-fg-subtle' role='status'>
            No notifications yet.
          </Flex>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

const DefaultStory = () => {
  const { index } = useClientStory();
  return index === 0 ? <AliceColumn /> : <BobColumn />;
};

const meta = {
  title: 'plugins/plugin-messenger/stories/Messenger',
  render: DefaultStory,
  // The client grid is innermost so the layout wraps both columns rather than each one.
  decorators: [
    withMultiClientProvider({
      numClients: 2,
      createIdentity: true,
      createSpace: true,
      inboxRelay,
      types: [Feed.Feed, Message.Message, Notifications.Notifications, Organization.Organization],
      onCreateSpace: async ({ space }) => {
        space.db.add(Organization.make({ name: LINKED_OBJECT_NAME }));
      },
    }),
    withMosaic(),
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Alice and Bob share a space, which makes them contacts. Alice sends; Bob's materializer stores
 * the message in his own space and his panel lists it with an unread badge.
 */
export const TwoUsers: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alice = within(await canvas.findByTestId('messenger.alice', {}, { timeout: 20_000 }));
    const bob = within(await canvas.findByTestId('messenger.bob', {}, { timeout: 20_000 }));

    // 1. Bob becomes Alice's contact once the shared-space invitation completes.
    const send = await alice.findByTestId('messenger.send');
    await userEvent.type(await alice.findByTestId('messenger.text'), 'Please review');
    await waitFor(() => expect(send).toBeEnabled(), { timeout: 20_000 });

    // 2. Alice sends; the tile and the badge appear on Bob's side.
    await userEvent.click(send);
    const tile = await bob.findByText('Please review', {}, { timeout: 20_000 });
    await waitFor(() => expect(bob.getByTestId('messenger.badge')).toHaveTextContent('1'), { timeout: 10_000 });

    // 3. Opening the tile marks it read, which clears the badge, and resolves the link in the shared space.
    await userEvent.click(tile);
    await waitFor(() => expect(bob.queryByTestId('messenger.badge')).toBeNull(), { timeout: 10_000 });
    await bob.findByText(`Opened “${LINKED_OBJECT_NAME}”`, {}, { timeout: 10_000 });
  },
};
