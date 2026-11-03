//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';

import { ClientService, layer as clientLayer } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Routine from '@dxos/compute/Routine';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { ConfigService, configPreset } from '@dxos/config';
import { Database, Feed, Filter, Obj, Order, Query } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { Message } from '@dxos/types';

import { GMAIL_SOURCE } from '../src/constants.ts';
import { type SpaceSnapshot, groupInvocations } from './checks.ts';
import { CanaryError } from './mailbox.ts';

/** An in-memory client against preview EDGE, destroyed when the scope closes. */
export const previewClientLayer = clientLayer.pipe(
  Layer.provide(Layer.succeed(ConfigService, configPreset({ edge: 'preview' }))),
);

/** The types the canary reads and writes; registered once per client. */
const TYPES = [
  AccessToken.AccessToken,
  Connection.Connection,
  Cursor.Cursor,
  Feed.Feed,
  Mailbox.Mailbox,
  Message.Message,
  Routine.Routine,
  Trace.Message,
  Trigger.Trigger,
];

/**
 * Signs the in-process client in as the canary identity. Each sign-in admits the process as a new device:
 * no device key is kept between runs.
 */
export const recoverIdentity = Effect.fn('mail-canary.recoverIdentity')(function* (recoveryPhrase: string) {
  const client = yield* ClientService;
  yield* Effect.promise(() => client.addTypes(TYPES));
  yield* Effect.tryPromise({
    try: () => client.halo.recoverIdentity({ recoveryCode: recoveryPhrase }),
    // The cause can carry the phrase, so it is not passed on.
    catch: () => new CanaryError({ message: 'cannot recover the canary identity' }),
  });
  return client;
});

/** A space of the canary identity, read through the in-process client. */
export class CanarySpace {
  /** Waits until a space of the signed-in identity has replicated; its spaces arrive over HALO after recovery. */
  static open = Effect.fn('mail-canary.CanarySpace.open')(function* (spaceId: string) {
    if (!SpaceId.isValid(spaceId)) {
      return yield* new CanaryError({ message: `not a space id: ${spaceId}` });
    }
    const client = yield* ClientService;
    const space = yield* Effect.suspend(() => {
      const space = client.spaces.get(spaceId);
      return space ? Effect.succeed(space) : new CanaryError({ message: `space ${spaceId} never appeared` });
    }).pipe(Effect.retry({ schedule: Schedule.spaced('1 second'), times: 120 }));
    return yield* ready(space);
  });

  /** Creates a space owned by the signed-in identity. */
  static create = Effect.fn('mail-canary.CanarySpace.create')(function* (name: string) {
    const client = yield* ClientService;
    const space = yield* Effect.tryPromise({
      try: () => client.spaces.create({ name }),
      catch: (cause) => new CanaryError({ message: `cannot create a space: ${String(cause)}` }),
    });
    return yield* ready(space);
  });

  readonly #space: Space;

  constructor(space: Space) {
    this.#space = space;
  }

  get spaceId(): string {
    return this.#space.id;
  }

  get space(): Space {
    return this.#space;
  }

  /** Pushes local writes to EDGE and waits until the documents match. */
  syncToEdge(): Effect.Effect<void, CanaryError> {
    return Effect.tryPromise({
      try: () => this.#space.internal.syncToEdge({ timeout: 300_000, onProgress: () => {} }),
      catch: (cause) => new CanaryError({ message: `space did not sync with EDGE: ${String(cause)}` }),
    }).pipe(Effect.retry({ times: 2 }));
  }

  /** Waits until the documents match EDGE, then reads the snapshot (`readSnapshot` pulls the feeds itself). */
  snapshot(): Effect.Effect<SpaceSnapshot, CanaryError> {
    return this.syncToEdge().pipe(Effect.andThen(readSnapshot()), Effect.provide(Database.layer(this.#space.db)));
  }
}

/** Waits until the space's database is open and turns on EDGE replication, off on a newly admitted device. */
const ready = (space: Space): Effect.Effect<CanarySpace, CanaryError> =>
  Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: () => space.waitUntilReady(),
      catch: (cause) => new CanaryError({ message: `space ${space.id} is not ready: ${String(cause)}` }),
    });
    if (space.internal.data.edgeReplication !== EdgeReplicationSetting.ENABLED) {
      yield* Effect.promise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
    }
    return new CanarySpace(space);
  });

/**
 * The mailbox's synced messages, the mail sync's invocations from every Execution Trace feed (racing
 * writers can create a second), and the remote timer triggers. Feeds replicate apart from the documents,
 * so each is pulled before it is read.
 */
export const readSnapshot = Effect.fn('mail-canary.readSnapshot')(
  function* () {
    const [mailbox] = yield* Database.query(Filter.type(Mailbox.Mailbox)).run;
    if (!mailbox) {
      return yield* new CanaryError({ message: 'the space has no mailbox' });
    }
    const feed = yield* Database.load(mailbox.feed);
    yield* pull(feed);
    const messages = (yield* Database.query(Query.select(Filter.type(Message.Message)).from(feed)).run).flatMap(
      (message) => {
        const gmailId = Obj.getKeys(message, GMAIL_SOURCE).at(0)?.id;
        return gmailId ? [{ gmailId, subject: message.properties?.subject, sender: message.sender.email }] : [];
      },
    );

    // A space whose sync never ran has no Execution Trace feed yet: no invocations, which the checks judge.
    const traceFeeds = yield* Database.query(FeedTraceSink.query).run;
    const traces = yield* Effect.forEach(traceFeeds, (traceFeed) =>
      pull(traceFeed).pipe(
        Effect.andThen(
          Database.query(Query.select(Filter.type(Trace.Message)).from(traceFeed).orderBy(Order.natural())).run,
        ),
      ),
    );

    const triggers = (yield* Database.query(Filter.type(Trigger.Trigger)).run)
      .filter((trigger) => trigger.remote === true && trigger.spec?.kind === 'timer')
      .map((trigger) => ({ id: trigger.id, enabled: trigger.enabled === true }));
    return { invocations: groupInvocations(traces.flat()), messages, triggers } satisfies SpaceSnapshot;
  },
  Effect.mapError((error) => (error instanceof CanaryError ? error : new CanaryError({ message: String(error) }))),
);

// EDGE answers the pull's query slowly at times; a retry clears it.
const pull = (feed: Feed.Feed) =>
  Database.Service.pipe(
    Effect.flatMap(({ db }) => Effect.tryPromise(() => db.syncFeed(feed, { shouldPush: false }))),
    Effect.retry({ times: 2 }),
  );
