//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';

import { ClientService } from '@dxos/client';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import * as Binding from '@dxos/plugin-connector/Binding';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as MailSync from '@dxos/plugin-inbox/MailSync';

import { GoogleOperation } from '#types';

import { GMAIL_CONNECTOR_ID, GOOGLE_INTEGRATION_SOURCE } from '../src/constants.ts';
import {
  type CheckResult,
  type ExpectedMessage,
  type Failure,
  type RunStats,
  type SpaceSnapshot,
  checkMessages,
  checkRuns,
} from './checks.ts';
import {
  CANARY_ACCOUNT,
  CanaryError,
  type CanaryMailbox,
  type GmailCredentials,
  type MailboxError,
  mintAccessToken,
} from './mailbox.ts';
import { CanarySpace } from './space.ts';

/** The name of the throwaway space; a run removes any it finds left over from a run that died. */
export const FULL_SYNC_SPACE_NAME = 'Mail canary full sync';

const DAY_MS = 24 * 60 * 60_000;

/** What stage 3 produced: one fresh space synced from scratch, checked, and deleted. */
export type FullSyncReport = {
  readonly ok: boolean;
  readonly checks: CheckResult[];
  readonly runs: RunStats;
  readonly spaceId?: string;
  readonly days: number;
  /** Gmail messages inside the window when the stage started. */
  readonly expected: number;
  /** Messages in the fresh space's mailbox feed when the wait ended. */
  readonly synced: number;
  /** Seconds until every expected message had synced and the backfill had reached the horizon. */
  readonly syncSeconds?: number;
};

export type FullSyncOptions = {
  /** How far back the fresh binding syncs, as its `syncBackDays`. */
  readonly days: number;
  readonly syncTimeout: Duration.Input;
  readonly pollInterval: Duration.Input;
  /** How often the space's access token is replaced; under the hour a Google access token lasts. */
  readonly tokenRefresh: Duration.Input;
};

/** The Gmail calls stage 3 makes: it only reads the mailbox. */
export type FullSyncMailbox = Pick<CanaryMailbox, 'listIds'>;

/**
 * Stage 3. Creates a space, binds it to the canary account with a `days`-long sync horizon and the product's own
 * remote sync routine, waits for EDGE to sync it from scratch, checks it against Gmail, and deletes the space.
 *
 * The space gets a plain access token minted from the canary's own grant rather than a kms-held one: kms-service
 * registers a refresh token only from an OAuth consent in a browser. The token is replaced while the stage waits,
 * since a Google access token lasts an hour.
 */
export class FullSync {
  readonly #mailbox: FullSyncMailbox;
  readonly #credentials: GmailCredentials;

  constructor(mailbox: FullSyncMailbox, credentials: GmailCredentials) {
    this.#mailbox = mailbox;
    this.#credentials = credentials;
  }

  run(options: FullSyncOptions): Effect.Effect<FullSyncReport, MailboxError, ClientService> {
    return Effect.gen({ self: this }, function* () {
      const startedAt = new Date();
      yield* removeLeftovers();
      const expected = yield* this.expected(options.days, startedAt);
      const space = yield* CanarySpace.create(FULL_SYNC_SPACE_NAME);
      const synced = yield* this.#sync(space, expected, options, startedAt).pipe(Effect.result);
      const removed = yield* remove(space).pipe(Effect.result);
      const removal = check('F4', 'Fresh space deleted', [
        ...(Result.isFailure(removed) ? [{ class: 'SETUP' as const, message: removed.failure.message }] : []),
      ]);
      if (Result.isFailure(synced)) {
        const failed = check('F1', 'Every Gmail message of the window synced', [
          { class: 'SETUP', message: synced.failure.message },
        ]);
        return report({
          checks: [failed, removal],
          spaceId: space.spaceId,
          days: options.days,
          expected: expected.length,
        });
      }
      return report({
        ...synced.success,
        checks: [...synced.success.checks, removal],
        spaceId: space.spaceId,
        days: options.days,
        expected: expected.length,
      });
    });
  }

  /**
   * The Gmail messages a sync over the last `days` must bring in, newest first, listed with the sync's own scope.
   * The window starts two days inside the horizon, since Gmail's `after:` is day-granular in the account's zone.
   */
  expected(days: number, now: Date): Effect.Effect<ExpectedMessage[], MailboxError> {
    const after = new Date(now.getTime() - (days - 2) * DAY_MS);
    const date = `${after.getUTCFullYear()}/${after.getUTCMonth() + 1}/${after.getUTCDate()}`;
    return this.#mailbox
      .listIds(`in:anywhere -in:spam -in:trash -in:drafts -in:chats after:${date}`)
      .pipe(Effect.map((ids) => ids.map((gmailId) => ({ gmailId }))));
  }

  #sync(
    space: CanarySpace,
    expected: readonly ExpectedMessage[],
    { days, syncTimeout, pollInterval, tokenRefresh }: FullSyncOptions,
    startedAt: Date,
  ) {
    return Effect.gen({ self: this }, function* () {
      const accessToken = yield* connect(yield* mintAccessToken(this.#credentials), days).pipe(
        Effect.provide(Database.layer(space.space.db)),
      );
      yield* space.syncToEdge();
      yield* space.runSync();

      const deadline = startedAt.getTime() + Duration.toMillis(syncTimeout);
      let mintedAt = Date.now();
      let snapshot: SpaceSnapshot;
      let backfilled: boolean;
      let syncSeconds: number | undefined;
      while (true) {
        if (Date.now() - mintedAt >= Duration.toMillis(tokenRefresh)) {
          const token = yield* mintAccessToken(this.#credentials);
          Obj.update(accessToken, (accessToken) => {
            accessToken.token = token;
          });
          mintedAt = Date.now();
        }
        snapshot = yield* space.snapshot();
        log.info('stage 3: waiting', {
          spaceId: space.spaceId,
          expected: expected.length,
          synced: snapshot.messages.length,
        });
        backfilled = yield* reachedHorizon(days).pipe(Effect.provide(Database.layer(space.space.db)));
        const synced = new Set(snapshot.messages.map((message) => message.gmailId));
        if (backfilled && expected.every((message) => synced.has(message.gmailId))) {
          syncSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000);
          break;
        }
        if (Date.now() >= deadline) {
          break;
        }
        yield* Effect.sleep(pollInterval);
      }

      const runs = checkRuns('F2', snapshot.invocations, { now: Date.now(), since: startedAt.getTime() });
      const backfill: Failure[] = backfilled
        ? []
        : [
            {
              class: runs.troubled ? 'STALL' : snapshot.invocations.length === 0 ? 'OFF' : 'DATA',
              message: `the binding's backfill never reached its ${days}-day horizon`,
            },
          ];
      return {
        checks: [
          checkMessages('F1', 'Every Gmail message of the window synced', snapshot, expected, runs.troubled),
          runs.check,
          check('F3', 'Backfill reached the horizon', backfill),
        ],
        runs: runs.runs,
        synced: snapshot.messages.length,
        syncSeconds,
      };
    });
  }
}

/**
 * Binds a new mailbox to the canary account as Composer does when a user adds Gmail: an access token, its
 * connection, a binding with the sync horizon, and the connector's remote sync routine.
 */
const connect = (token: string, days: number) =>
  Effect.gen(function* () {
    const accessToken = yield* Database.add(
      AccessToken.make({ source: GOOGLE_INTEGRATION_SOURCE, account: CANARY_ACCOUNT, token }),
    );
    const connection = yield* Database.add(
      Connection.make({ name: CANARY_ACCOUNT, connectorId: GMAIL_CONNECTOR_ID, accessToken: Ref.make(accessToken) }),
    );
    const mailbox = yield* Database.add(Mailbox.make({ name: CANARY_ACCOUNT }));
    const cursor = yield* Binding.bind({ connection, connector: undefined, target: Ref.make(mailbox) });
    Obj.update(cursor, (cursor) => {
      cursor.spec.options = { syncBackDays: days };
    });
    const routine = yield* Database.add(
      Binding.scaffoldRoutine({
        connection,
        operation: GoogleOperation.GoogleMailSync,
        spec: Trigger.specTimer(MailSync.MAIL_SYNC_CRON),
        remote: MailSync.MAIL_REMOTE_SYNC,
      }),
    );
    if (!routine.triggers[0]?.target) {
      return yield* new CanaryError({ message: 'the sync routine has no trigger' });
    }
    yield* Database.flush();
    return accessToken;
  });

/** Whether the binding's backward walk has reached the horizon: `min` is clamped to it once the walk is done. */
const reachedHorizon = (days: number) =>
  Effect.gen(function* () {
    const cursors = (yield* Database.query(Filter.type(Cursor.Cursor)).run).filter(Cursor.isExternal);
    const horizon = Cursor.resolveHorizon({ now: new Date(), syncBackDays: days }).getTime();
    const minKey = cursors.length === 1 ? Cursor.parseKey(cursors[0].min) : 0;
    return minKey > 0 && minKey <= horizon;
  });

/**
 * Takes the space out of use before deleting it: disables its triggers and blanks its token, so EDGE stops syncing
 * it even if the deletion never reaches EDGE.
 */
const remove = (space: CanarySpace): Effect.Effect<void, CanaryError> =>
  Effect.gen(function* () {
    yield* Effect.gen(function* () {
      for (const trigger of yield* Database.query(Filter.type(Trigger.Trigger)).run) {
        Obj.update(trigger, (trigger) => {
          trigger.enabled = false;
        });
      }
      for (const accessToken of yield* Database.query(Filter.type(AccessToken.AccessToken)).run) {
        Obj.update(accessToken, (accessToken) => {
          accessToken.token = '';
        });
      }
      yield* Database.flush();
    }).pipe(Effect.provide(Database.layer(space.space.db)));
    yield* space.syncToEdge();
    yield* Effect.tryPromise({
      try: () => space.space.delete(),
      catch: (cause) => new CanaryError({ message: `cannot delete space ${space.spaceId}: ${String(cause)}` }),
    });
  });

/** Deletes every space a killed run left behind, so leftovers never pile up or keep syncing. */
const removeLeftovers = () =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    // Every space opens at once: one by one, each that never opens would hold the run for its whole timeout.
    yield* Effect.forEach(
      client.spaces.get(),
      (space) =>
        Effect.tryPromise(() => space.waitUntilReady()).pipe(
          Effect.timeout('2 minutes'),
          Effect.flatMap(() =>
            space.properties.name === FULL_SYNC_SPACE_NAME ? remove(new CanarySpace(client, space)) : Effect.void,
          ),
          Effect.ignore,
        ),
      { concurrency: 'unbounded', discard: true },
    );
  });

const check = (id: string, name: string, failures: Failure[]): CheckResult => ({
  id,
  name,
  ok: failures.length === 0,
  failures,
});

const report = ({
  checks,
  runs = { runs: 0, invocations: 0, succeeded: 0, yielded: 0, failed: 0 },
  synced = 0,
  ...rest
}: Omit<FullSyncReport, 'ok' | 'runs' | 'synced'> & { runs?: RunStats; synced?: number }): FullSyncReport => ({
  ...rest,
  ok: checks.every(({ ok }) => ok),
  checks,
  runs,
  synced,
});
