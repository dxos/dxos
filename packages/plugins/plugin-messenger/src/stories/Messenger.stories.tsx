//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Surface, useOperationInvoker, useOptionalAtomCapability } from '@dxos/app-framework/ui';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Client } from '@dxos/client';
import { MemoryEdgeInbox } from '@dxos/client-services/testing';
import { type Space, SpaceMember_Role } from '@dxos/client/echo';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { ClientPluginManager } from '@dxos/plugin-client/testing';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { toPublicKey } from '@dxos/protocols/buf';
import { useClient } from '@dxos/react-client';
import { useSpace, useSpaces } from '@dxos/react-client/echo';
import { useContacts, useIdentity } from '@dxos/react-client/halo';
import { type WithMultiClientProviderProps, useClientStory, withMultiClientProvider } from '@dxos/react-client/testing';
import { Block, Button, Checkbox, Empty, Flex, Icon, Input, Panel, Select, Toolbar } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Organization } from '@dxos/types';

import { NotificationsPanel } from '#components';
import { loadLink, makeSender, startInboxMaterializer } from '#materializer';
import { MessengerPlugin } from '#plugin';
import { translations } from '#translations';
import { MESSENGER_COMPANION, MessengerCapabilities, Notifications } from '#types';

/** Stands in for EDGE: both clients' inboxes are routed through it. */
const inboxRelay = new MemoryEdgeInbox();

const LINKED_OBJECT_NAME = 'Q3 planning';

const INVITED_SPACE_NAME = 'Design team';

/** Both clients and the shared space every story starts from; Alice is client 0, Bob client 1. */
const withClients = (options: Pick<WithMultiClientProviderProps, 'wrapper'> = {}) =>
  withMultiClientProvider({
    numClients: 2,
    createIdentity: true,
    createSpace: true,
    inboxRelay,
    types: [Feed.Feed, Message.Message, Notifications.Notifications, Organization.Organization],
    onCreateSpace: async ({ space }) => {
      space.db.add(Organization.make({ name: LINKED_OBJECT_NAME }));
    },
    ...options,
  });

//
// Alice: picks a contact and sends a message, optionally linking an object in the shared space.
//

const SenderColumn = () => {
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
    <Panel.Root data-testid='messenger.sender'>
      <Panel.Header>
        <Toolbar.Root>
          <Block>
            <Icon icon='ph--user--regular' />
          </Block>
          <span>Alice</span>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <Flex column gap='md' classNames='p-3'>
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

const UnreadBadge = ({ containers }: { containers: readonly Notifications.Notifications[] }) => {
  const viewAtom = useMemo(() => Atom.make((get) => Notifications.deriveView(get, containers)), [containers]);
  const unread = Notifications.countUnread(useAtomValue(viewAtom));
  return unread > 0 ? (
    <span className='rounded-full bg-accent-bg text-accent-fg text-xs px-2' data-testid='messenger.badge'>
      {unread}
    </span>
  ) : null;
};

const ReceiverColumn = () => {
  const client = useClient();
  const space = useOwnSpace();
  const containers = useQuery(space?.db, Filter.type(Notifications.Notifications));
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
    <Panel.Root data-testid='messenger.receiver'>
      <Panel.Header>
        <Toolbar.Root>
          <Block>
            <Icon icon='ph--envelope--regular' />
          </Block>
          <span>Bob</span>
          <Toolbar.Separator variant='gap' />
          <div className='flex items-center gap-2 px-2'>
            {containers.length > 0 && <UnreadBadge containers={containers} />}
            {opened && <span className='text-sm text-fg-muted'>{`Opened “${opened}”`}</span>}
          </div>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        {containers.length > 0 ? (
          <NotificationsPanel attendableId='notifications-panel' containers={containers} onOpen={handleOpen} />
        ) : (
          <Empty>No notifications yet.</Empty>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

//
// Invitation: each client runs the real plugins, so the invitation travels the app's own path.
//

/** Gives a profile the default and settings spaces the app creates on first run, as the materializer needs. */
const setupProfile = ({ client }: { client: Client }) =>
  AppSpace.getSettingsSpace(client) ? Effect.void : AppSpace.setupIdentitySpaces(client).pipe(Effect.asVoid);

const ClientPlugins = ({ index, children }: PropsWithChildren<{ index: number }>) => (
  <ClientPluginManager
    id={`messenger-client-${index}`}
    clientOptions={{ onClientInitialized: setupProfile }}
    plugins={() => [...corePlugins(), SpacePlugin({}), StorybookPlugin.make({}), MessengerPlugin()]}
  >
    {children}
  </ClientPluginManager>
);

/** Alice: owns a second space Bob is not in, and adds him to it through the members operation. */
const InviterColumn = () => {
  const client = useClient();
  const contacts = useContacts();
  const { invokePromise } = useOperationInvoker();
  const [space, setSpace] = useState<Space>();
  const [status, setStatus] = useState<string>();
  const inviteeKey = useMemo(() => toPublicKey(contacts[0]?.identityKey)?.toHex(), [contacts]);

  useEffect(() => {
    let cancelled = false;
    void client.spaces.create({ name: INVITED_SPACE_NAME }).then(async (space) => {
      await space.waitUntilReady();
      if (!cancelled) {
        setSpace(space);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const handleInvite = useCallback(() => {
    if (!space || !inviteeKey) {
      return;
    }

    setStatus('Inviting…');
    void invokePromise(SpaceOperation.AddMembers, {
      space,
      identityKeys: [inviteeKey],
      role: SpaceMember_Role.EDITOR,
    }).then(({ data, error }) =>
      setStatus(error ? String(error) : data?.admitted.length ? 'Invited.' : `Not admitted: ${data?.failed[0]?.error}`),
    );
  }, [invokePromise, space, inviteeKey]);

  return (
    <Panel.Root data-testid='messenger.inviter'>
      <Panel.Header>
        <Toolbar.Root>
          <Block>
            <Icon icon='ph--user--regular' />
          </Block>
          <span>Alice</span>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <Flex column gap='md' classNames='p-3'>
          <Button
            variant='primary'
            icon='ph--user-plus--regular'
            label={`Add Bob to “${INVITED_SPACE_NAME}”`}
            disabled={!space || !inviteeKey}
            onClick={handleInvite}
            data-testid='messenger.invite'
          />
          {status && <span className='text-sm text-fg-muted'>{status}</span>}
        </Flex>
      </Panel.Body>
    </Panel.Root>
  );
};

/** Bob: the messenger's own deck companion surface, over the containers its materializer keeps. */
const InviteeColumn = () => {
  const containers = useOptionalAtomCapability(MessengerCapabilities.NotificationsContainers);
  const spaces = useSpaces();
  const joined = spaces.some((space) => space.properties.name === INVITED_SPACE_NAME);
  const companionData = useMemo(() => ({ id: 'notifications-panel', subject: MESSENGER_COMPANION }), []);

  return (
    <Panel.Root data-testid='messenger.invitee'>
      <Panel.Header>
        <Toolbar.Root>
          <Block>
            <Icon icon='ph--envelope--regular' />
          </Block>
          <span>Bob</span>
          <Toolbar.Separator variant='gap' />
          <div className='flex items-center gap-2 px-2'>
            {containers && containers.length > 0 && <UnreadBadge containers={containers} />}
            {joined && (
              <span className='text-sm text-fg-muted' data-testid='messenger.joined'>
                {`Member of “${INVITED_SPACE_NAME}”`}
              </span>
            )}
          </div>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <Surface.Surface type={AppSurface.deckCompanion(MESSENGER_COMPANION)} data={companionData} limit={1} />
      </Panel.Body>
    </Panel.Root>
  );
};

const InvitationStory = () => {
  const { index } = useClientStory();
  return index === 0 ? <InviterColumn /> : <InviteeColumn />;
};

const DefaultStory = () => {
  const { index } = useClientStory();
  return index === 0 ? <SenderColumn /> : <ReceiverColumn />;
};

const meta = {
  title: 'plugins/plugin-messenger/stories/Messenger',
  render: DefaultStory,
  // Each story adds the client grid innermost, so the layout wraps both columns rather than each one.
  decorators: [withAttention(), withMosaic(), withLayout({ layout: 'fullscreen' }), withTheme()],
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
  decorators: [withClients()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sender = within(await canvas.findByTestId('messenger.sender', {}, { timeout: 20_000 }));
    const receiver = within(await canvas.findByTestId('messenger.receiver', {}, { timeout: 20_000 }));

    // 1. Bob becomes Alice's contact once the shared-space invitation completes.
    const send = await sender.findByTestId('messenger.send');
    await userEvent.type(await sender.findByTestId('messenger.text'), 'Please review');
    await waitFor(() => expect(send).toBeEnabled(), { timeout: 20_000 });

    // 2. Alice sends; the tile and the badge appear on Bob's side.
    await userEvent.click(send);
    const tile = await receiver.findByText('Please review', {}, { timeout: 20_000 });
    await waitFor(() => expect(receiver.getByTestId('messenger.badge')).toHaveTextContent('1'), { timeout: 10_000 });

    // 3. Opening the tile marks it read, which clears the badge, and resolves the link in the shared space.
    await userEvent.click(tile);
    await waitFor(() => expect(receiver.queryByTestId('messenger.badge')).toBeNull(), { timeout: 10_000 });
    await receiver.findByText(`Opened “${LINKED_OBJECT_NAME}”`, {}, { timeout: 10_000 });
  },
};

/**
 * Alice adds Bob to a space he is not in with `SpaceOperation.AddMembers`, which admits him and sends
 * an invitation message. Bob's materializer stores it, the companion renders it through plugin-client's
 * space-invitation surface, and Join runs `JoinBySpaceKey`.
 */
export const Invitation: Story = {
  render: InvitationStory,
  decorators: [withClients({ wrapper: ClientPlugins })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inviter = within(await canvas.findByTestId('messenger.inviter', {}, { timeout: 30_000 }));
    const invitee = within(await canvas.findByTestId('messenger.invitee', {}, { timeout: 30_000 }));

    // 1. Alice can add Bob once he is her contact and her second space is ready.
    const invite = await inviter.findByTestId('messenger.invite');
    await waitFor(() => expect(invite).toBeEnabled(), { timeout: 30_000 });

    // 2. Alice adds Bob; the invitation tile and the badge appear on Bob's side.
    await userEvent.click(invite);
    await inviter.findByText('Invited.', {}, { timeout: 20_000 });
    const join = await invitee.findByTestId('space-invitation-card.join', {}, { timeout: 30_000 });
    await waitFor(() => expect(invitee.getByTestId('messenger.badge')).toHaveTextContent('1'), { timeout: 10_000 });

    // 3. Joining makes Bob a member, the tile offers to open the space, and the read tile clears the badge.
    await userEvent.click(join);
    await invitee.findByTestId('messenger.joined', {}, { timeout: 60_000 });
    await invitee.findByTestId('space-invitation-card.open', {}, { timeout: 10_000 });
    await waitFor(() => expect(invitee.queryByTestId('messenger.badge')).toBeNull(), { timeout: 10_000 });
  },
};
