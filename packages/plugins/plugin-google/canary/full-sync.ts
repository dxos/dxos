//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Result from 'effect/Result';

import { ClientService } from '@dxos/client';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import * as Binding from '@dxos/plugin-connector/Binding';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as MailSync from '@dxos/plugin-inbox/MailSync';

import { GoogleOperation } from '#types';

import { GMAIL_CONNECTOR_ID, GOOGLE_INTEGRATION_SOURCE } from '../src/constants.ts';
import { ALL_MAIL_SCOPE } from '../src/operations/mail/sync/fetch.ts';
import { LIVE_GMAIL_ACCOUNT } from '../src/testing/live-credentials.ts';
import {
  type CheckResult,
  type ExpectedMessage,
  type Failure,
  type RunStats,
  type SpaceSnapshot,
  check,
  checkMessages,
  checkRuns,
} from './checks.ts';
import { type CanaryMailbox, type GmailCredentials, type MailboxError, mintAccessToken } from './mailbox.ts';
import { CanarySpace, type EdgeWaits } from './space.ts';

/** The name of the throwaway space; a run deletes any it finds left over from a run that died. */
export const FULL_SYNC_SPACE_NAME = 'Mail canary full sync';

const DAY_MS = 24 * 60 * 60_000;

/** What stage 3 produced: one fresh space synced from scratch, checked, and deleted. */
export type FullSyncReport = {
  readonly checks: CheckResult[];
  readonly days: number;
  /** Gmail messages inside the window when the stage started. */
  readonly expected: number;
  readonly spaceId?: string;
  readonly runs?: RunStats;
  /** Messages in the fresh space's mailbox feed when the wait ended. */
  readonly synced?: number;
  /** Seconds until every expected message had synced and the backfill had reached the horizon. */
  readonly syncSeconds?: number;
};

export type FullSyncOptions = {
  /** How far back the fresh binding syncs, as its `syncBackDays`. */
  readonly days: number;
  readonly syncTimeout: Duration.Duration;
  readonly pollInterval: Duration.Duration;
  /** How often the space's access token is replaced; under the hour a Google access token lasts. */
  readonly tokenRefresh: Duration.Duration;
  /** How long a sync invocation may stay open before it counts as hung. */
  readonly hungAfter: Duration.Duration;
  readonly waits: EdgeWaits;
};

/** The Gmail calls stage 3 makes: it only reads the mailbox. */
export type FullSyncMailbox = Pick<CanaryMailbox, 'listIds'>;

/**
 * Stage 3: bind a new space to the canary account with the product's own remote sync routine, let EDGE sync it from
 * scratch, check it against Gmail, and delete it on EDGE. The space gets a plain access token minted from the canary's
 * grant, since kms-service registers a refresh token only from a browser consent.
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
      const startedAt = new Date(yield* Clock.currentTimeMillis);
      const leftovers = yield* removeLeftovers(options.waits);
      const expected = yield* this.expected(options.days, startedAt);
      const space = yield* CanarySpace.create(FULL_SYNC_SPACE_NAME, options.waits);
      return yield* Effect.gen({ self: this }, function* () {
        const synced = yield* this.#sync(space, expected, options, startedAt).pipe(Effect.result);
        const removed = yield* space.delete().pipe(Effect.result);
        const removal = check('F4', 'Fresh space deleted on EDGE', [
          ...leftovers,
          ...(Result.isFailure(removed) ? [{ class: 'SETUP' as const, message: removed.failure.message }] : []),
        ]);
        const base = { days: options.days, expected: expected.length, spaceId: space.spaceId };
        return Result.isSuccess(synced)
          ? { ...base, ...synced.success, checks: [...synced.success.checks, removal] }
          : {
              ...base,
              checks: [
                check('F1', 'Every Gmail message of the window synced', [
                  { class: 'SETUP', message: synced.failure.message },
                ]),
                removal,
              ],
            };
      }).pipe(
        // The success path deletes the space itself to report how it went; any other exit still must not leak it.
        Effect.onExit((exit) => (Exit.isSuccess(exit) ? Effect.void : space.delete().pipe(Effect.ignore))),
      );
    });
  }

  /**
   * The Gmail messages a sync over the last `days` must bring in, listed with the sync's own scope, starting two days
   * inside the horizon since Gmail's `after:` is day-granular in the account's zone.
   */
  expected(days: number, now: Date): Effect.Effect<ExpectedMessage[], MailboxError> {
    const after = new Date(now.getTime() - (days - 2) * DAY_MS);
    const date = `${after.getUTCFullYear()}/${after.getUTCMonth() + 1}/${after.getUTCDate()}`;
    return this.#mailbox
      .listIds(`${ALL_MAIL_SCOPE} after:${date}`)
      .pipe(Effect.map((ids) => ids.map((gmailId) => ({ gmailId }))));
  }

  #sync(
    space: CanarySpace,
    expected: readonly ExpectedMessage[],
    { days, syncTimeout, pollInterval, tokenRefresh, hungAfter }: FullSyncOptions,
    startedAt: Date,
  ) {
    return Effect.gen({ self: this }, function* () {
      const token = yield* mintAccessToken(this.#credentials);
      let mintedAt = yield* Clock.currentTimeMillis;
      const { accessToken, cursor } = yield* connect(token, days).pipe(Effect.provide(Database.layer(space.space.db)));
      yield* space.syncToEdge();
      yield* space.runSync();

      const deadline = startedAt.getTime() + Duration.toMillis(syncTimeout);
      let snapshot: SpaceSnapshot;
      let backfilled: boolean;
      let syncSeconds: number | undefined;
      while (true) {
        if ((yield* Clock.currentTimeMillis) - mintedAt >= Duration.toMillis(tokenRefresh)) {
          const fresh = yield* mintAccessToken(this.#credentials);
          mintedAt = yield* Clock.currentTimeMillis;
          Obj.update(accessToken, (accessToken) => {
            accessToken.token = fresh;
          });
        }
        snapshot = yield* space.snapshot();
        backfilled = reachedHorizon(cursor, days);
        log.info('stage 3: waiting', { expected: expected.length, synced: snapshot.messages.length, backfilled });
        const synced = new Set(snapshot.messages.map((message) => message.gmailId));
        const now = yield* Clock.currentTimeMillis;
        if (backfilled && expected.every((message) => synced.has(message.gmailId))) {
          syncSeconds = Math.round((now - startedAt.getTime()) / 1000);
          break;
        }
        if (now >= deadline) {
          break;
        }
        yield* Effect.sleep(pollInterval);
      }

      const runs = checkRuns('F2', snapshot.invocations, {
        now: yield* Clock.currentTimeMillis,
        since: startedAt.getTime(),
        hungAfter: Duration.toMillis(hungAfter),
      });
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
 * Binds a new mailbox to the canary account as Composer does when a user adds Gmail: an access token, its connection,
 * a binding with the sync horizon, and the connector's remote sync routine.
 */
const connect = (token: string, days: number) =>
  Effect.gen(function* () {
    const accessToken = yield* Database.add(
      AccessToken.make({ source: GOOGLE_INTEGRATION_SOURCE, account: LIVE_GMAIL_ACCOUNT, token }),
    );
    const connection = yield* Database.add(
      Connection.make({
        name: LIVE_GMAIL_ACCOUNT,
        connectorId: GMAIL_CONNECTOR_ID,
        accessToken: Ref.make(accessToken),
      }),
    );
    const mailbox = yield* Database.add(Mailbox.make({ name: LIVE_GMAIL_ACCOUNT }));
    const cursor = yield* Binding.bind({ connection, connector: undefined, target: Ref.make(mailbox) });
    Obj.update(cursor, (cursor) => {
      cursor.spec.options = { syncBackDays: days };
    });
    yield* Database.add(
      Binding.scaffoldRoutine({
        connection,
        operation: GoogleOperation.GoogleMailSync,
        spec: Trigger.specTimer(MailSync.MAIL_SYNC_CRON),
        remote: MailSync.MAIL_REMOTE_SYNC,
      }),
    );
    yield* Database.flush();
    return { accessToken, cursor };
  });

/** Whether the binding's backward walk has reached the horizon: `min` is clamped to it once the walk is done. */
const reachedHorizon = (cursor: Cursor.Cursor, days: number): boolean => {
  const minKey = Cursor.parseKey(cursor.min);
  return minKey > 0 && minKey <= Cursor.resolveHorizon({ now: new Date(), syncBackDays: days }).getTime();
};

/** Deletes the spaces a killed run left behind; a leftover that cannot be deleted is reported, since it keeps syncing. */
const removeLeftovers = (waits: EdgeWaits): Effect.Effect<Failure[], never, ClientService> =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    const failures = yield* Effect.forEach(
      client.spaces.get(),
      (space) =>
        Effect.gen(function* () {
          // A space that never opens cannot be named, so it is not taken for a leftover.
          const opened = yield* Effect.tryPromise(() => space.waitUntilReady()).pipe(
            Effect.timeoutOption(waits.open),
            Effect.orElseSucceed(() => Option.none()),
          );
          if (Option.isNone(opened) || space.properties.name !== FULL_SYNC_SPACE_NAME) {
            return [];
          }
          const removed = yield* new CanarySpace(client, space, waits).delete().pipe(Effect.result);
          return Result.isFailure(removed)
            ? [{ class: 'SETUP' as const, message: `leftover ${space.id}: ${removed.failure.message}` }]
            : [];
        }),
      { concurrency: 'unbounded' },
    );
    return failures.flat();
  });
