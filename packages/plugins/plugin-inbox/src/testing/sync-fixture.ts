//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability, PluginManager } from '@dxos/app-framework';
import { Credential, Operation } from '@dxos/compute';
import { Blob, Database, Ref, Relation, Tag } from '@dxos/echo';
import { type EchoTestBuilder } from '@dxos/echo-client/testing';
import * as InboxResolver from '@dxos/extractor-lib';
import { Connection, SyncBinding } from '@dxos/plugin-connector';
import { TagIndex } from '@dxos/schema';
import { AccessToken, Cursor, Message, Organization, Person } from '@dxos/types';

import { GMAIL_SOURCE } from '../constants';
import { type GmailDataset, GoogleCredentials, GoogleMailApi, type JmapDataset, JmapMailApi } from '../services';
import { Mailbox } from '../types';

// Shared harness for the mock-provider sync tests (unit + OTEL + benchmark): a real ECHO db seeded
// with a mailbox binding, plus the ambient services `runGmailSync`/`runJmapSync` require. Not exported
// from `@dxos/plugin-inbox/testing` — it pulls app-framework/compute, so it stays a local test helper.

/** The ECHO types the sync writes: messages, contacts, tags, tag index, binding + cursor. */
export const SYNC_TEST_TYPES = [
  Message.Message,
  Person.Person,
  Organization.Organization,
  Tag.Tag,
  TagIndex.TagIndex,
  Mailbox.Mailbox,
  AccessToken.AccessToken,
  Connection.Connection,
  Cursor.Cursor,
  SyncBinding.SyncBinding,
  Blob.Blob,
];

/** Seeds a mailbox binding (Connection → Mailbox) with its feed, tag index, and cursor. */
export const seedMailboxBinding = async (
  builder: EchoTestBuilder,
  {
    source = GMAIL_SOURCE,
    connectorId = 'gmail',
    token = 'token',
  }: { source?: string; connectorId?: string; token?: string } = {},
) => {
  const { db } = await builder.createDatabase({ types: SYNC_TEST_TYPES });
  const mailbox = db.add(Mailbox.make({ name: 'Test' }));
  const accessToken = db.add(AccessToken.make({ source, token }));
  const connection = db.add(Connection.make({ connectorId, accessToken: Ref.make(accessToken) }));
  const binding = db.add(SyncBinding.make({ [Relation.Source]: connection, [Relation.Target]: mailbox }));
  await db.flush({ indexes: true });
  return { db, mailbox, connection, binding };
};

/**
 * The db + resolver + operation ambient services shared by both providers' mock-sync tests. The
 * seeded mailbox has no on-arrival extractors, so the `onArrivalExtractors` stage short-circuits and
 * never touches `Capability`/`Operation` — they are provided (empty manager, unavailable invoker)
 * only to satisfy the requirement channel.
 */
const ambientSyncServices = (db: Database.Database) =>
  Layer.mergeAll(
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

/** The ambient services `runGmailSync` requires, backed by a mock Gmail API + a real db. */
export const inboxSyncTestServices = (db: Database.Database, dataset: GmailDataset) =>
  Layer.mergeAll(GoogleMailApi.mock(dataset), ambientSyncServices(db));

/**
 * The ambient services `runGmailSync` requires, backed by the REAL Gmail HTTP API authenticated from
 * the given connection's `AccessToken`. Used by the fixture-fetch tool to sync a real account in-process
 * (no EDGE / function deployment). The connection's access token must carry a valid Gmail OAuth token.
 */
export const inboxSyncLiveServices = (db: Database.Database, connectionRef: Ref.Ref<Connection.Connection>) => {
  // `GoogleCredentials.fromConnection` short-circuits with the connection's cached token, so the
  // CredentialsService is never called — but it stays in the requirement channel, so a stub satisfies it.
  const unusedCredentials = Layer.succeed(Credential.CredentialsService, {
    queryCredentials: () => Promise.reject(new Error('unused: connection carries a cached token')),
    getCredential: () => Promise.reject(new Error('unused: connection carries a cached token')),
  });
  return Layer.mergeAll(
    GoogleMailApi.Live.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(GoogleCredentials.fromConnection(connectionRef).pipe(Layer.provide(Database.layer(db)))),
      Layer.provide(unusedCredentials),
    ),
    ambientSyncServices(db),
  );
};

/** The ambient services `runJmapSync` requires, backed by a mock JMAP API + a real db. */
export const inboxJmapSyncTestServices = (db: Database.Database, dataset: JmapDataset) =>
  Layer.mergeAll(JmapMailApi.mock(dataset), ambientSyncServices(db));
