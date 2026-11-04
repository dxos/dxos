//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';

import { type Client, ClientService, layer as clientLayer } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Routine from '@dxos/compute/Routine';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { ConfigService, configPreset } from '@dxos/config';
import { Context } from '@dxos/context';
import { Database, Feed, Filter, Obj, Order, Query } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { EdgeCallFailedError } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { Message } from '@dxos/types';

import { GMAIL_SOURCE } from '../src/constants.ts';
import { type SpaceSnapshot, groupInvocations } from './checks.ts';
import { CanaryError } from './mailbox.ts';

/** An in-memory client against preview EDGE, destroyed when the scope closes. */
export const previewClientLayer = clientLayer.pipe(
  Layer.provide(Layer.succeed(ConfigService, configPreset({ edge: 'preview' }))),
);

/** How long the canary waits on EDGE before failing a step with a reason instead of hanging the run. */
export type EdgeWaits = {
  /** For a space to replicate and open. */
  readonly open: Duration.Duration;
  /** For one read of the space: documents matched with EDGE, then its feeds pulled. */
  readonly read: Duration.Duration;
  /** For EDGE to register a sync trigger it can run at once. */
  readonly trigger: Duration.Duration;
  /** For EDGE to tear a deleted space down. */
  readonly delete: Duration.Duration;
};

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

/** Signs the in-process client in as the canary identity; each run is a new device, keeping no device key. */
export const recoverIdentity = Effect.fn('mail-canary.recoverIdentity')(function* (recoveryPhrase: string) {
  const client = yield* ClientService.client;
  yield* Effect.promise(() => client.addTypes(TYPES));
  yield* Effect.tryPromise({
    try: () => client.halo.recoverIdentity({ recoveryCode: recoveryPhrase }),
    // The cause can carry the phrase, so it is not passed on.
    catch: () => new CanaryError({ message: 'cannot recover the canary identity' }),
  });
});

/** A space of the canary identity, read through the in-process client. */
export class CanarySpace {
  /** Waits until a space of the signed-in identity has replicated; its spaces arrive over HALO after recovery. */
  static open = Effect.fn('mail-canary.CanarySpace.open')(function* (spaceId: SpaceId, waits: EdgeWaits) {
    const client = yield* ClientService.client;
    const space = yield* Effect.suspend(() => {
      const space = client.spaces.get(spaceId);
      return space ? Effect.succeed(space) : new CanaryError({ message: `space ${spaceId} never appeared` });
    }).pipe(Effect.retry({ schedule: Schedule.spaced('1 second') }), timeout(waits.open, `space ${spaceId} to appear`));
    return yield* new CanarySpace(client, space, waits).#ready();
  });

  /** Creates a space owned by the signed-in identity. */
  static create = Effect.fn('mail-canary.CanarySpace.create')(function* (name: string, waits: EdgeWaits) {
    const client = yield* ClientService.client;
    const space = yield* Effect.tryPromise({
      try: () => client.spaces.create({ name }),
      catch: (cause) => new CanaryError({ message: `cannot create a space: ${String(cause)}` }),
    });
    return yield* new CanarySpace(client, space, waits).#ready();
  });

  readonly #client: Client;
  readonly #space: Space;
  readonly #waits: EdgeWaits;

  constructor(client: Client, space: Space, waits: EdgeWaits) {
    this.#client = client;
    this.#space = space;
    this.#waits = waits;
  }

  get spaceId(): SpaceId {
    return this.#space.id;
  }

  get space(): Space {
    return this.#space;
  }

  /** Waits until the space's database is open and turns on EDGE replication, off on a newly admitted device. */
  #ready(): Effect.Effect<CanarySpace, CanaryError> {
    return Effect.tryPromise({
      try: async () => {
        await this.#space.waitUntilReady();
        if (this.#space.internal.data.edgeReplication !== EdgeReplicationSetting.ENABLED) {
          await this.#space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
        }
        return this;
      },
      catch: (cause) => new CanaryError({ message: `space ${this.spaceId} is not ready: ${String(cause)}` }),
    }).pipe(timeout(this.#waits.open, `space ${this.spaceId} to open`));
  }

  /** Pushes local writes to EDGE and waits until the documents match. */
  syncToEdge(): Effect.Effect<void, CanaryError> {
    return Effect.tryPromise({
      try: () =>
        this.#space.internal.syncToEdge({ timeout: Duration.toMillis(this.#waits.read), onProgress: () => {} }),
      catch: (cause) => new CanaryError({ message: `space did not sync with EDGE: ${String(cause)}` }),
    });
  }

  /**
   * Asks EDGE to run the space's enabled remote timer triggers now rather than at their next cron tick, once EDGE has
   * registered them; when EDGE has not by the trigger wait, the cron still fires.
   */
  runSync(): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const triggerIds = (yield* Database.query(Filter.type(Trigger.Trigger)).run)
        .filter((trigger) => trigger.remote === true && trigger.enabled === true && trigger.spec?.kind === 'timer')
        .map((trigger) => trigger.id);
      const http = this.#client.edge.http;
      const registered = Effect.tryPromise(() => http.getSpaceTriggers(Context.default(), this.spaceId)).pipe(
        Effect.flatMap(({ triggers }) =>
          triggerIds.length > 0 &&
          triggerIds.every((id) => triggers.some((trigger) => trigger.triggerId === id && trigger.registered))
            ? Effect.void
            : Effect.fail(new CanaryError({ message: 'sync triggers not registered on EDGE yet' })),
        ),
        Effect.retry({ schedule: Schedule.spaced('10 seconds') }),
        timeout(this.#waits.trigger, 'EDGE to register the sync trigger'),
      );
      yield* registered;
      yield* Effect.forEach(triggerIds, (triggerId) =>
        Effect.tryPromise(() => http.forceRunCronTrigger(Context.default(), this.spaceId, triggerId)),
      );
    }).pipe(
      Effect.provide(Database.layer(this.#space.db)),
      Effect.catch((error) =>
        Effect.sync(() =>
          log.warn('cannot start the sync now; waiting for its cron', { spaceId: this.spaceId, error }),
        ),
      ),
    );
  }

  /** Waits until the documents match EDGE, then reads the snapshot (`readSnapshot` pulls the feeds itself). */
  snapshot(): Effect.Effect<SpaceSnapshot, CanaryError> {
    return this.syncToEdge().pipe(
      Effect.andThen(readSnapshot()),
      Effect.provide(Database.layer(this.#space.db)),
      timeout(this.#waits.read, `a read of space ${this.spaceId}`),
    );
  }

  /**
   * Deletes the space on EDGE, waits for the teardown, then tombstones it on this device. EDGE resets the space's
   * documents, feeds, index, secrets and scheduler; resetting its credential chain drops the canary's membership, so a
   * 403 on reading the space is the sign the teardown ran.
   */
  delete(): Effect.Effect<void, CanaryError> {
    const path = `/data/space/${this.spaceId}`;
    const request = (method: 'GET' | 'DELETE') =>
      Effect.tryPromise({
        try: () => this.#client.edge.http.request(Context.default(), path, { method }),
        catch: (cause) => new CanaryError({ message: `EDGE ${method} ${path}: ${String(cause)}`, cause }),
      });
    const tornDown = (error: CanaryError) => error.cause instanceof EdgeCallFailedError && error.cause.status === 403;
    return Effect.gen({ self: this }, function* () {
      yield* request('DELETE');
      yield* request('GET').pipe(
        Effect.flatMap(() => Effect.fail(new CanaryError({ message: `space ${this.spaceId} is still on EDGE` }))),
        Effect.catchIf(tornDown, () => Effect.void),
        Effect.retry({ schedule: Schedule.spaced('15 seconds') }),
        timeout(this.#waits.delete, `EDGE to tear space ${this.spaceId} down`),
      );
      yield* Effect.tryPromise({
        try: () => this.#space.delete(),
        catch: (cause) => new CanaryError({ message: `cannot tombstone ${this.spaceId}: ${String(cause)}` }),
      });
    });
  }
}

/** Fails with a reason once `duration` has passed. */
const timeout = (duration: Duration.Duration, what: string) =>
  Effect.timeoutOrElse({
    duration,
    orElse: () =>
      Effect.fail(new CanaryError({ message: `gave up waiting for ${what} after ${Duration.format(duration)}` })),
  });

/**
 * The mailbox's synced messages, the mail sync's invocations from every Execution Trace feed (racing writers can
 * create a second), and the remote timer triggers. Feeds replicate apart from the documents, so each is pulled first.
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
