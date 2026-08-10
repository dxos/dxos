//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CapabilityManager } from '@dxos/app-framework';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Blob, Database, Ref, Tag } from '@dxos/echo';
import { type EchoTestBuilder } from '@dxos/echo-client/testing';
import * as InboxResolver from '@dxos/extractor-lib';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

import * as Mailbox from '../types/Mailbox';

// Shared harness for the mock-provider sync tests (unit + OTEL + benchmark): a real ECHO db seeded with
// a mailbox binding, plus the ambient services a provider's sync entry point requires. Published as
// `@dxos/plugin-inbox/testing/sync` on its own subpath — a provider plugin's own sync tests build on it,
// while `./testing` stays free of `@dxos/compute` for consumers (e.g. Playwright) that only want the
// lighter helpers.

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
    source,
    connectorId,
    token = 'token',
    max,
    min,
    options,
  }: {
    /** Foreign-key source the seeded cursor commits under; must match the provider's own. */
    source: string;
    /** The binding connection's `connectorId`; the provider's own `Connector.id`. */
    connectorId: string;
    token?: string;
    /** Seeds the cursor's `max` watermark, as if a prior run already synced up to this key. */
    max?: string;
    /** Seeds the cursor's `min` watermark, as if a prior run already backfilled down to this key. */
    min?: string;
    /** Seeds `spec.options` (e.g. `syncBackDays`, `filter`) — read via `readBindingOptions`. */
    options?: Record<string, unknown>;
  },
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
