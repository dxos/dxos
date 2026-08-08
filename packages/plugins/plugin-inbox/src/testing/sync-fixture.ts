//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability, CapabilityManager } from '@dxos/app-framework';
import { Credential, Operation, Trace } from '@dxos/compute';
import { credentialsLayerFromDatabase } from '@dxos/compute-runtime';
import { Blob, Database, Ref, Tag } from '@dxos/echo';
import { type EchoTestBuilder } from '@dxos/echo-client/testing';
import * as InboxResolver from '@dxos/extractor-lib';
import { AccessToken, Cursor } from '@dxos/link';
import { Connection } from '@dxos/plugin-connector';
import { TagIndex } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

import { type RunMailSyncOptions, runMailSync } from '#sync';

import { GMAIL_SOURCE } from '../constants';
import { googleMailSyncProvider } from '../operations/mail/google/sync/sync-provider';
import { type GmailDataset, GoogleCredentials, GoogleMailApi } from '../services';
import { Mailbox } from '../types';

// Shared harness for the mock-provider sync tests (unit + OTEL + benchmark): a real ECHO db seeded with
// a mailbox binding, plus the ambient services a provider's sync entry point requires. Published as
// `@dxos/plugin-inbox/testing/sync` — a provider plugin's own sync tests build on it — but deliberately
// NOT from `@dxos/plugin-inbox/testing`, whose `node` condition must stay free of `@dxos/compute`
// (Playwright's loader; see `testing/node.ts`).

/**
 * Test entry point for the Gmail sync — `runMailSync` with the Gmail provider layer, leaving the API
 * for the test to supply (mock, counting, fault, or Live). Production inlines this in the handler.
 */
export const runGoogleSync = (options: RunMailSyncOptions) =>
  runMailSync(options).pipe(
    Effect.provide(googleMailSyncProvider({ userId: 'me', label: 'all' })),
    Effect.withSpan('google-sync'),
  );

/** The ECHO types the sync writes: messages, contacts, tags, tag index, connection + cursor. */
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
  Blob.Blob,
];

/** Seeds a mailbox binding (external-sync cursor authenticated by a Connection's access token → Mailbox). */
export const seedMailboxBinding = async (
  builder: EchoTestBuilder,
  {
    source = GMAIL_SOURCE,
    connectorId = 'gmail',
    token = 'token',
    max,
    min,
    options,
  }: {
    source?: string;
    connectorId?: string;
    token?: string;
    /** Seeds the cursor's `max` watermark, as if a prior run already synced up to this key. */
    max?: string;
    /** Seeds the cursor's `min` watermark, as if a prior run already backfilled down to this key. */
    min?: string;
    /** Seeds `spec.options` (e.g. `syncBackDays`, `filter`) — read via `readBindingOptions`. */
    options?: Record<string, unknown>;
  } = {},
) => {
  const { db } = await builder.createDatabase({ types: SYNC_TEST_TYPES });
  const mailbox = db.add(Mailbox.make({ name: 'Test' }));
  const accessToken = db.add(AccessToken.make({ source, token }));
  const connection = db.add(Connection.make({ connectorId, accessToken: Ref.make(accessToken) }));
  const binding = db.add(
    Cursor.makeExternal({ source: connection.accessToken, target: Ref.make(mailbox), max, min, options }),
  );
  await db.flush({ indexes: true });
  return { db, mailbox, connection, binding };
};

/**
 * Gives every sender in a generated dataset an Organization at its domain.
 *
 * Contact extraction is an allow-list — an unknown individual is not materialised (see
 * `shouldExtractContact`) — and these fixtures generate senders at random domains. Tests about the
 * sync pipeline wiring contacts through call this so they exercise that wiring rather than the
 * extraction policy, which has its own tests in `@dxos/extractor-lib`.
 */
export const seedSenderOrganizations = async (db: Database.Database, dataset: SenderDataset): Promise<void> => {
  const domains = new Set(senderDomainsOf(dataset));
  for (const domain of domains) {
    db.add(Organization.make({ name: domain, website: domain }));
  }
  await db.flush({ indexes: true });
};

/**
 * The shape {@link seedSenderOrganizations} reads, described structurally rather than as a union of the
 * providers' dataset types: this harness is shared by every provider plugin and must not name any of
 * them. Both `GmailDataset` (raw `payload.headers`) and `JmapDataset` (a structured `from` list) satisfy
 * it, and a new provider's fixtures need only match one of the two branches.
 */
export type SenderDataset = {
  readonly messages?: readonly {
    readonly payload?: { readonly headers?: readonly { readonly name: string; readonly value: string }[] };
  }[];
  // `from` is nullable and optional in JMAP (RFC 8621 allows an email with no From).
  readonly emails?: readonly { readonly from?: readonly { readonly email: string }[] | null }[];
};

/** Sender domains in a dataset — Gmail records the From header, JMAP a structured `from` list. */
const senderDomainsOf = (dataset: SenderDataset): string[] =>
  [...(('messages' in dataset ? dataset.messages : dataset.emails) ?? [])]
    .map((message) => {
      const from =
        'payload' in message
          ? message.payload?.headers?.find((header) => header.name === 'From')?.value
          : 'from' in message
            ? message.from?.[0]?.email
            : undefined;
      return from?.match(/[\w.+-]+@([\w.-]+)/)?.[1];
    })
    .filter((domain): domain is string => !!domain);

/**
 * The db + resolver + operation ambient services shared by both providers' mock-sync tests. The
 * seeded mailbox has no on-arrival extractors, so the `onArrivalExtractors` stage short-circuits and
 * never touches `Operation` — it is provided (unavailable invoker) only to satisfy the requirement
 * channel. `Trace.TraceService` defaults to a noop writer; pass a custom trace layer to observe
 * `status.update` events from the sync.
 */
export const ambientSyncServices = (
  db: Database.Database,
  options: { traceLayer?: Layer.Layer<Trace.TraceService> } = {},
) =>
  Layer.mergeAll(
    Database.layer(db),
    InboxResolver.Live.pipe(Layer.provide(Database.layer(db))),
    Layer.succeed(Capability.Service, CapabilityManager.make({ registry: Registry.make() })),
    options.traceLayer ?? Trace.writerLayerNoop,
    Layer.succeed(Operation.Service, {
      invoke: () => Effect.die('Operation.Service unused: mailbox has no on-arrival extractors'),
      schedule: () => Effect.die('Operation.Service unused: mailbox has no on-arrival extractors'),
      invokePromise: async () => ({ error: new Error('Operation.Service unused') }),
    }),
  );

/** The ambient services `runGoogleSync` requires, backed by a mock Gmail API + a real db. */
export const inboxSyncTestServices = (
  db: Database.Database,
  dataset: GmailDataset,
  options?: { traceLayer?: Layer.Layer<Trace.TraceService> },
) => Layer.mergeAll(GoogleMailApi.mock(dataset), ambientSyncServices(db, options));

/**
 * The ambient services `runGoogleSync` requires, backed by the REAL Gmail HTTP API authenticated from
 * the given connection's `AccessToken`. Used by the fixture-fetch tool to sync a real account in-process
 * (no EDGE / function deployment). The connection's access token must carry a valid Gmail OAuth token.
 */
export const inboxSyncLiveServices = (db: Database.Database, connectionRef: Ref.Ref<Connection.Connection>) => {
  // The fixture connection carries a real token on the object, so no credential resolves through EDGE.
  const credentials = credentialsLayerFromDatabase().pipe(
    Layer.provide(Database.layer(db)),
    Layer.provide(Credential.AccessTokenResolver.notAvailable),
  );
  return Layer.mergeAll(
    GoogleMailApi.Live.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(GoogleCredentials.fromConnection(connectionRef).pipe(Layer.provide(Database.layer(db)))),
      Layer.provide(credentials),
    ),
    ambientSyncServices(db),
  );
};
