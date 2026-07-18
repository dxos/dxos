//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppSpace } from '@dxos/app-toolkit';
import { Invitation, InvitationEncoder } from '@dxos/client/invitations';
import { persistentClientServices } from '@dxos/client/testing';
import { Config } from '@dxos/config';
import { Database, Feed, Tag } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useClient } from '@dxos/react-client';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

const HOST_STORY_TYPES = [
  Feed.Feed,
  Mailbox.Mailbox,
  Message.Message,
  Organization.Organization,
  Person.Person,
  Tag.Tag,
  TagIndex.TagIndex,
];

// Bulk senders seeded into the hosted mailbox — each carries a List-Unsubscribe header so
// `dx mailbox subscriptions` (which calls `Mailbox.deriveSubscriptions`) reports them as
// subscriptions after a device joins this identity over EDGE.
const SEED_SENDERS = [
  { email: 'newsletter@acme.io', name: 'Acme Weekly', subject: 'Your Acme digest' },
  { email: 'noreply@substack.com', name: 'The Pragmatic Engineer', subject: 'This week in engineering' },
  { email: 'deals@shopmart.com', name: 'ShopMart Deals', subject: '48-hour flash sale' },
] as const;

// Computed once at module scope (see MailboxSync) so re-renders don't spawn fresh workers.
// `edgeFeatures.agents` (not set by `configPreset`) is required to provision the EDGE agent that
// recovery-code login resolves — without it EDGE returns `Agent status: not_found`.
const HOST_STORY_CLIENT_SERVICES = persistentClientServices(
  new Config({
    version: 1,
    runtime: {
      client: {
        edgeFeatures: { signaling: true, echoReplicator: true, feedReplicator: true, agents: true },
      },
      services: {
        edge: { url: 'https://edge.dxos.workers.dev' },
      },
    },
  }),
);

const HostStory = () => {
  const client = useClient();
  const [invitation, setInvitation] = useState<{ code: string; secret?: string; state: string }>();
  const [recoveryCode, setRecoveryCode] = useState<string>();

  const identity = client.halo.identity.get();
  const space = AppSpace.getPersonalSpace(client);

  // Recovery code (seed phrase) — the path a bun CLI can actually use to join this identity:
  // `dx account login --method recovery-code` recovers over EDGE (HTTP), whereas device-invitation
  // relies on p2p which does not work in bun. Recovery resolves the identity's EDGE agent, so
  // provision one first (otherwise EDGE returns `Agent status: not_found`).
  const [status, setStatus] = useState<string>();
  const onCreateRecoveryCode = useCallback(async () => {
    const hasEdgeAgent = !!client.services.services.EdgeAgentService;
    setStatus(`EdgeAgentService present: ${hasEdgeAgent}; provisioning…`);
    try {
      await client.services.services.EdgeAgentService?.createAgent(undefined, { timeout: 20_000 });
      setStatus('Agent provisioned; creating recovery credential…');
    } catch (err) {
      setStatus(`Agent provisioning error: ${String(err)}`);
      return;
    }
    const result = await client.services.services.IdentityService?.createRecoveryCredential({});
    setRecoveryCode(result?.recoveryCode);
    setStatus((prev) => `${prev} — ready.`);
  }, [client]);

  const onShare = useCallback(() => {
    // Persistent + shared-secret device invitation: resumable while the code is copied. Note: only
    // usable browser-to-browser / from Composer — the bun CLI cannot complete a p2p device join.
    const observable = client.halo.share({ authMethod: Invitation.AuthMethod.SHARED_SECRET, persistent: true });
    observable.subscribe(
      (inv) => {
        if (inv.state >= Invitation.State.CONNECTING) {
          setInvitation({
            code: InvitationEncoder.encode(inv),
            secret: inv.authCode,
            state: Invitation.State[inv.state] ?? String(inv.state),
          });
        }
      },
      (err) => setInvitation({ code: '', state: `ERROR: ${String(err)}` }),
    );
  }, [client]);

  return (
    <div className='flex flex-col gap-4 p-4 max-is-[48rem]' data-testid='mailbox-host'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-lg font-medium'>Live mailbox host</h1>
        <p className='text-sm text-description'>
          A persistent, EDGE-dev space seeded with a mailbox. Connect the CLI to this identity, then read the mailbox
          over EDGE replication:
        </p>
        <pre className='text-xs rounded bg-modalSurface p-2 whitespace-pre-wrap'>
          {'dx account login --method recovery-code "<recovery code>"\ndx mailbox subscriptions'}
        </pre>
      </div>

      <dl className='grid grid-cols-[8rem_1fr] gap-1 text-sm'>
        <dt className='text-description'>Identity</dt>
        <dd className='font-mono break-all' data-testid='identity-did'>
          {identity?.did ?? '<none>'}
        </dd>
        <dt className='text-description'>Space</dt>
        <dd className='font-mono break-all' data-testid='space-id'>
          {space?.id ?? '<none>'}
        </dd>
        <dt className='text-description'>Seeded senders</dt>
        <dd>{SEED_SENDERS.map((sender) => sender.email).join(', ')}</dd>
      </dl>

      <div className='flex flex-col gap-2 rounded border border-separator p-3'>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Recovery code (CLI login)</span>
          <button
            className='rounded bg-accentSurface px-3 py-1 text-accentSurfaceText'
            onClick={onCreateRecoveryCode}
            data-testid='recovery-button'
          >
            Create recovery code
          </button>
        </div>
        {status && (
          <div className='text-xs text-description' data-testid='recovery-status'>
            {status}
          </div>
        )}
        {recoveryCode && (
          <textarea
            className='font-mono text-xs rounded border border-separator p-2'
            readOnly
            rows={3}
            value={recoveryCode}
            data-testid='recovery-code'
          />
        )}
      </div>

      <div className='flex flex-col gap-2 rounded border border-separator p-3'>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Device invitation (browser / Composer only)</span>
          <button className='rounded bg-neutralSurface px-3 py-1' onClick={onShare} data-testid='share-button'>
            Create device invitation
          </button>
        </div>
        {invitation && (
          <>
            <div className='text-sm text-description'>State: {invitation.state}</div>
            {invitation.code && (
              <textarea
                className='font-mono text-xs rounded border border-separator p-2'
                readOnly
                rows={3}
                value={invitation.code}
                data-testid='invitation-code'
              />
            )}
            {invitation.secret && (
              <input
                className='font-mono text-sm rounded border border-separator p-2'
                readOnly
                value={invitation.secret}
                data-testid='invitation-secret'
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

const meta = {
  title: 'stories/stories-inbox/MailboxHost',
  render: HostStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager(() => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: HOST_STORY_TYPES,
          ...HOST_STORY_CLIENT_SERVICES,
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              if (client.halo.identity.get()) {
                return;
              }

              const { personalSpace: space } = yield* initializeIdentity(client);
              const mailbox = space.db.add(Mailbox.make({ name: 'Inbox' }));
              const feed = yield* Effect.promise(() => mailbox.feed.load());
              const messages = SEED_SENDERS.map((sender, index) =>
                Message.make({
                  created: new Date(2026, 0, index + 1).toISOString(),
                  sender: { email: sender.email, name: sender.name },
                  blocks: [{ _tag: 'text', text: `Hello — ${sender.subject}. Click here to unsubscribe.` }],
                  properties: {
                    subject: sender.subject,
                    listUnsubscribe: `<mailto:unsubscribe@${sender.email.split('@')[1]}>`,
                  },
                }),
              );
              yield* Feed.append(feed, messages).pipe(Effect.provide(Database.layer(space.db)));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        SpacePlugin({}),
        InboxPlugin(),
        StorybookPlugin({}),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...inboxTranslations],
  },
} satisfies Meta<typeof HostStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
