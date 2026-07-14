//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager, withSurfaceDebug } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppSpace } from '@dxos/app-toolkit';
import { type Space } from '@dxos/client/echo';
import { persistentClientServices } from '@dxos/client/testing';
import { Operation, Trigger } from '@dxos/compute';
import { configPreset } from '@dxos/config';
import { Feed, Filter, Obj, Query, Ref, Relation, Tag } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Connection, SyncBinding } from '@dxos/plugin-connector';
import { ConnectorPlugin } from '@dxos/plugin-connector/plugin';
import { translations as connectorTranslations } from '@dxos/plugin-connector/translations';
import { DebugPlugin } from '@dxos/plugin-debug/plugin';
import { InboxOperation, Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { ProgressPlugin } from '@dxos/plugin-progress/plugin';
import { translations as progressTranslations } from '@dxos/plugin-progress/translations';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { ModuleContainer } from '@dxos/story-modules';
import { AccessToken, Cursor, Message, Organization, Person } from '@dxos/types';

import { MailboxTriggerRelation, Module, StoryModulesPlugin, StorySyncPlugin } from '../testing';

const TYPES = [
  AccessToken.AccessToken,
  Connection.Connection,
  Cursor.Cursor,
  Feed.Feed,
  Mailbox.Mailbox,
  MailboxTriggerRelation,
  Message.Message,
  Operation.PersistentOperation,
  Organization.Organization,
  Person.Person,
  SyncBinding.SyncBinding,
  Tag.Tag,
  TagIndex.TagIndex,
  Trigger.Trigger,
];

// Computed once at module scope (not inside the `withPluginManager` initializer, which re-runs on
// every render) so the story doesn't spawn a fresh dedicated worker/coordinator on each re-render.
const CLIENT_SERVICES = persistentClientServices(configPreset({ edge: 'dev' }));

/**
 * Watches for the personal space's mailbox and (once it exists) wires an idempotent Gmail sync
 * trigger — see {@link wireSyncTrigger}. Installed from the ClientPlugin initializer for routine
 * stories (moved here from the former `SyncTriggerRunner` component).
 */
const installSyncTrigger = (space: Space) => {
  let wired = false;
  space.db.query(Filter.type(Mailbox.Mailbox)).subscribe(
    (query) => {
      const mailbox = query.results[0];
      if (!mailbox || wired) {
        return;
      }
      wired = true;
      wireSyncTrigger(space, mailbox);
    },
    { fire: true },
  );
};

/**
 * Creates a manual trigger wired to {@link InboxOperation.GoogleMailSync} once the mailbox's sync
 * binding appears. Idempotent — skips when a {@link MailboxTriggerRelation} already links the mailbox
 * to a trigger (persists across reloads).
 */
const wireSyncTrigger = (space: Space, mailbox: Mailbox.Mailbox) => {
  let hasTrigger = false;
  let creating = false;

  space.db.query(Query.select(Filter.id(mailbox.id)).sourceOf(MailboxTriggerRelation)).subscribe(
    (query) => {
      hasTrigger = query.results.length > 0;
    },
    { fire: true },
  );

  space.db.query(Query.select(Filter.id(mailbox.id)).targetOf(SyncBinding.SyncBinding)).subscribe(
    (query) => {
      const binding = query.results.find(SyncBinding.instanceOf);
      if (!binding || hasTrigger || creating) {
        return;
      }

      creating = true;
      const trigger = space.db.add(
        Trigger.make({
          [Obj.Parent]: mailbox,
          enabled: true,
          runnable: Ref.make(Operation.serialize(InboxOperation.GoogleMailSync)),
          spec: Trigger.specDirect(),
          input: { binding: Ref.make(binding) },
        }),
      );
      space.db.add(
        Relation.make(MailboxTriggerRelation, {
          [Relation.Source]: mailbox,
          [Relation.Target]: trigger,
        }),
      );
      void space.db.flush();
    },
    { fire: true },
  );
};

type DecoratorOptions = {
  trigger?: boolean;
};

const createDecorators = ({ trigger = false }: DecoratorOptions = {}) => [
  withSurfaceDebug(false),
  withLayout({ layout: 'fullscreen' }),
  withPluginManager(() => ({
    setupEvents: [AppActivationEvents.SetupSettings],
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types: TYPES,
        ...CLIENT_SERVICES,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            // TODO(burdon): This is messy.
            let space: Space | undefined;
            if (client.halo.identity.get()) {
              const existing = AppSpace.getPersonalSpace(client);
              if (existing) {
                yield* Effect.promise(() => existing.waitUntilReady());
              }
              space = existing;
            } else {
              const result = yield* initializeIdentity(client);
              space = result.personalSpace;
              space.db.add(Mailbox.make());
              yield* Effect.promise(() => space!.db.flush({ indexes: true }));
            }

            // Auto-create the Gmail sync trigger for routine stories (moved here from the
            // `SyncTriggerRunner` component): watch for the mailbox's sync binding and idempotently
            // wire a `GoogleMailSync` trigger.
            if (space && trigger) {
              installSyncTrigger(space);
            }
          }),
      }),
      SpacePlugin({}),
      InboxPlugin(),
      ConnectorPlugin(),
      DebugPlugin({}),
      PreviewPlugin(),
      ProgressPlugin(),
      ...(trigger ? [RoutinePlugin()] : []),
      StorySyncPlugin(),
      StoryModulesPlugin(),
      StorybookPlugin({}),
    ],
  })),
];

const DefaultStory = () => (
  <ModuleContainer
    layout={[
      [Module.Mailbox, Module.Message],
      [Module.Archive, Module.Stats],
      [Module.Connector, Module.Triggers],
    ]}
    compact
  />
);

const meta = {
  title: 'stories/stories-inbox/MailboxSync',
  component: DefaultStory,
  decorators: createDecorators(),
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...inboxTranslations, ...connectorTranslations, ...progressTranslations],
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};

export const WithSyncTrigger: Story = {
  render: DefaultStory,
  decorators: createDecorators({ trigger: true }),
  args: {
    batch: 10,
  },
};
