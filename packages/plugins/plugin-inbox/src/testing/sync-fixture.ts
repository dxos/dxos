//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability, PluginManager } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Ref, Relation, Tag } from '@dxos/echo';
import { type EchoTestBuilder } from '@dxos/echo-client/testing';
import * as InboxResolver from '@dxos/extractor-lib';
import { Connection, SyncBinding } from '@dxos/plugin-connector';
import { TagIndex } from '@dxos/schema';
import { AccessToken, Cursor, Message, Organization, Person } from '@dxos/types';

import { GMAIL_SOURCE } from '../constants';
import { type GmailDataset, GoogleMailApi } from '../services';
import { Mailbox, ThreadIndex } from '../types';

// Shared harness for the mock-Gmail sync tests (unit + OTEL + benchmark): a real ECHO db seeded with
// a mailbox binding, plus the ambient services `runGmailSync` requires. Not exported from
// `@dxos/plugin-inbox/testing` — it pulls app-framework/compute, so it stays a local test helper.

/** The ECHO types the sync writes: messages, contacts, tags, thread/tag indices, binding + cursor. */
export const SYNC_TEST_TYPES = [
  Message.Message,
  Person.Person,
  Organization.Organization,
  Tag.Tag,
  TagIndex.TagIndex,
  ThreadIndex.ThreadIndex,
  Mailbox.Mailbox,
  AccessToken.AccessToken,
  Connection.Connection,
  Cursor.Cursor,
  SyncBinding.SyncBinding,
];

/** Seeds a mailbox binding (Connection → Mailbox) with its feed, tag index, and cursor. */
export const seedMailboxBinding = async (builder: EchoTestBuilder) => {
  const { db } = await builder.createDatabase({ types: SYNC_TEST_TYPES });
  const mailbox = db.add(Mailbox.make({ name: 'Test' }));
  const accessToken = db.add(AccessToken.make({ source: GMAIL_SOURCE, token: 'token' }));
  const connection = db.add(Connection.make({ connectorId: 'gmail', accessToken: Ref.make(accessToken) }));
  const binding = db.add(SyncBinding.make({ [Relation.Source]: connection, [Relation.Target]: mailbox }));
  await db.flush({ indexes: true });
  return { db, mailbox, binding };
};

/**
 * The ambient services `runGmailSync` requires, backed by a mock Gmail API + a real db. The seeded
 * mailbox has no on-arrival extractors, so the `onArrivalExtractors` stage short-circuits and never
 * touches `Capability`/`Operation` — they are provided (empty manager, unavailable invoker) only to
 * satisfy the requirement channel.
 */
export const inboxSyncTestServices = (db: Database.Database, dataset: GmailDataset) =>
  Layer.mergeAll(
    GoogleMailApi.mock(dataset),
    Database.layer(db),
    InboxResolver.Live.pipe(Layer.provide(Database.layer(db))),
    Layer.succeed(
      Capability.Service,
      PluginManager.make({ pluginLoader: () => Effect.die('no plugins in test'), plugins: [], enabled: [] })
        .capabilities,
    ),
    Layer.succeed(Operation.Service, {
      invoke: () => Effect.die('Operation.Service unused: mailbox has no on-arrival extractors'),
      schedule: () => Effect.die('Operation.Service unused: mailbox has no on-arrival extractors'),
      invokePromise: async () => ({ error: new Error('Operation.Service unused') }),
    }),
  );
