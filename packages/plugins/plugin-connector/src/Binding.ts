//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CapabilityNotFoundError } from '@dxos/app-framework';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { RunAgainError } from '@dxos/compute';
import { ServiceNotAvailableError } from '@dxos/compute/errors';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trigger from '@dxos/compute/Trigger';
import type * as TriggerEvent from '@dxos/compute/TriggerEvent';
import { Database, EID, Filter, type Key, Obj, Query, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type AccessToken, Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { makeRoutine } from '@dxos/plugin-routine';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { meta } from '#meta';
import { ConnectorSpec } from '#types';

import { connectionDeckSubject } from './constants';
import {
  ConnectionAuthExpiredError,
  ConnectionSyncError,
  SyncRoutineMissingError,
  TargetAccountMismatchError,
  isUnauthorizedError,
} from './errors';
import * as SyncTemplate from './SyncTemplate';

/**
 * The binding between a local object (a Mailbox, a Calendar) and the remote feed a `Connection` syncs
 * into it: a `Cursor` targeting the object, authenticated by the connection's access token.
 *
 * A binding outlives its credential. Deleting a connection leaves the cursor in place — its synced
 * range, merge snapshots and delta token describe the remote *account*, not the credential — so the
 * binding goes dormant rather than away, and `find` reports the object as unbound until a connection
 * backs it again. Which is why almost everything here is keyed on the cursor or the target it binds.
 */

//
// Predicates.
//

/**
 * Entity id a ref addresses, or `undefined` if its URI is not an `echo:` EID.
 *
 * Refs must never be compared by raw `uri` string: one `echo:` EID has several spellings for the
 * same object — the canonical local `echo:///<id>`, the legacy local `echo:/<id>` still present in
 * persisted data, and the qualified `echo://<spaceId>/<id>` — so a cursor stored under one spelling
 * would not match a freshly-made ref under another, and a binding would read as absent. `EID.parse`
 * (which `getEntityId` applies) normalizes all three.
 */
const refEntityId = (ref: Ref.Ref<any>): string | undefined => {
  const uri = EID.tryParse(ref.uri);
  return uri === undefined ? undefined : EID.getEntityId(uri);
};

/**
 * True when `cursor` is an external-sync cursor authenticated by `connection`'s access token.
 * `Cursor` no longer relates to `Connection` directly (that coupling was removed to make `Cursor`
 * an infrastructure type) — a connection's cursors are found by matching `spec.source` against its
 * `accessToken`. Fuzzy if an access token is ever shared across connections.
 */
export const isForConnection = (
  cursor: Cursor.Cursor,
  connection: Connection.Connection,
): cursor is Cursor.ExternalCursor => {
  if (!Cursor.isExternal(cursor)) {
    return false;
  }
  const source = refEntityId(cursor.spec.source);
  return source !== undefined && source === refEntityId(connection.accessToken);
};

/** True when `cursor`'s `spec.target` is the given object. */
export const targets = (cursor: Cursor.Cursor, target: Obj.Unknown): boolean =>
  refEntityId(cursor.spec.target) === target.id;

/** True when `accessToken` is the credential `connection` authenticates with. */
export const isTokenFor = (accessToken: AccessToken.AccessToken, connection: Connection.Connection): boolean =>
  refEntityId(connection.accessToken) === accessToken.id;

//
// Lookup.
//

/** An object's binding: the external cursor that syncs it, plus the connection authenticating it. */
export type Binding = {
  cursor: Cursor.ExternalCursor;
  connection: Connection.Connection;
};

/**
 * The external-sync {@link Cursor} targeting `target` together with the {@link Connection} whose
 * access token authenticates it, or `undefined` when the target has no such pair.
 *
 * Both halves are required because deleting a connection does not cascade to the cursors referencing
 * its access token, and a target holding such an orphan cannot sync — read as bound it would offer
 * neither Connect (suppressed by the binding) nor Sync (suppressed by the missing connection). Pure
 * over already-read lists so graph extensions and React hooks share one notion of "bound".
 */
export const find = (
  cursors: readonly Cursor.Cursor[],
  connections: readonly Connection.Connection[],
  target: Obj.Unknown,
): Binding | undefined => {
  for (const cursor of cursors) {
    if (!Cursor.isExternal(cursor) || !targets(cursor, target)) {
      continue;
    }
    const connection = connections.find((candidate) => isForConnection(cursor, candidate));
    if (connection) {
      return { cursor, connection };
    }
  }
};

/**
 * {@link find} over the target's whole space.
 *
 * `Cursor` has no reverse-ref index on `spec.target` (it's one level below a discriminated-union
 * struct field, which the typed `Query.referencedBy` key doesn't reach), so this scans every cursor
 * in the space and filters — mirrors this plugin's other cursor lookups.
 */
export const query = (target: Obj.Unknown): Effect.Effect<Binding | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    return find(cursors, connections, target);
  });

/**
 * The external-sync {@link Cursor} whose target is the given object (mailbox, calendar, …), when a
 * connection still backs it. The cursor's `spec.source` is the access token that authenticates sync
 * for that object; credentials and sync re-invocation flow from it.
 */
export const queryCursor = (
  target: Obj.Unknown,
): Effect.Effect<Cursor.ExternalCursor | undefined, never, Database.Service> =>
  query(target).pipe(Effect.map((binding) => binding?.cursor));

/**
 * External cursors targeting `target` that no {@link Connection} backs — dormant bindings, holding the
 * progress of a sync whose credential was deleted. They are kept rather than discarded (see
 * `prepare`): the synced range and merge snapshots they carry are what let a re-bind of the
 * same account resume instead of re-walking the whole horizon.
 */
export const findDormant = (
  cursors: readonly Cursor.Cursor[],
  connections: readonly Connection.Connection[],
  target: Obj.Unknown,
): Cursor.ExternalCursor[] =>
  cursors.filter(
    (cursor): cursor is Cursor.ExternalCursor =>
      Cursor.isExternal(cursor) &&
      targets(cursor, target) &&
      !connections.some((connection) => isForConnection(cursor, connection)),
  );

/** {@link findDormant} over the target's whole space. */
export const queryDormant = (target: Obj.Unknown): Effect.Effect<Cursor.ExternalCursor[], never, Database.Service> =>
  Effect.gen(function* () {
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    return findDormant(cursors, connections, target);
  });

//
// The account a target syncs, recorded on the target itself.
//

/**
 * Verdict of {@link checkAccount}.
 * - `match`: the target is already synced from this account, so its dormant binding may be resumed.
 * - `unknown`: nothing recorded on either side — bind, record, but start the sync from scratch.
 * - `mismatch`: the target holds another account's data; binding it here would merge two accounts.
 */
export type AccountCheck = 'match' | 'unknown' | 'mismatch';

/**
 * The remote account a bindable target (Mailbox, Calendar, …) mirrors, recorded on the target itself as
 * a foreign key `{ source: <service host>, id: <account> }`.
 *
 * The account describes the target, not the binding: it says whose data the object already holds, so it
 * has to outlive both the credential (deleted with its `Connection`) and the cursor. It is what makes
 * "may this binding resume?" answerable, and what stops a mailbox full of one account's mail from being
 * re-bound to another.
 */
export const readAccount = (target: Obj.Unknown, source: string): string | undefined =>
  Obj.getKeys(target, source)[0]?.id;

/** Records the account a target is synced from; a no-op when one is already recorded for `source`. */
export const recordAccount = (target: Obj.Unknown, source: string, account: string): void => {
  if (readAccount(target, source) !== undefined) {
    return;
  }
  Obj.update(target, (target) => {
    Obj.getMeta(target).keys.push({ source, id: account });
  });
};

/**
 * Whether `account` may bind `target`. Refuses only on contradiction: an unrecorded account (every
 * target that predates this record) or a credential that reports no account is not evidence of a match,
 * so it binds without inheriting the dormant binding's progress.
 */
export const checkAccount = (target: Obj.Unknown, source: string, account: string | undefined): AccountCheck => {
  const recorded = readAccount(target, source);
  if (recorded === undefined || account === undefined) {
    return 'unknown';
  }
  return recorded === account ? 'match' : 'mismatch';
};

//
// Schedule: the sync Routine and trigger driving a binding.
//

/**
 * Finds the sync trigger of `connection`'s sync Routine: the trigger carries the connection as its
 * `input.connection`, so the reverse-ref from the connection reaches it whether or not a Routine owns
 * it. One Routine covers the whole account — its operation fans out over every binding at run time
 * (see {@link syncAll}) — so a binding added later needs no schedule of its own.
 */
export const findTrigger = (connection: Connection.Connection) =>
  Effect.gen(function* () {
    const triggers = yield* Database.query(Query.select(Filter.id(connection.id)).referencedBy(Trigger.Trigger)).run;
    return triggers.find((trigger) => !!trigger.spec);
  });

/**
 * Finds `connection`'s sync Routine — the owner of its sync trigger. Deleting a connection must take
 * this Routine with it, or the schedule keeps firing against a connection that is gone.
 */
export const findRoutine = (
  connection: Connection.Connection,
): Effect.Effect<Routine.Routine | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const trigger = yield* findTrigger(connection);
    const owner = trigger ? Obj.getParent(trigger) : undefined;
    return owner && Obj.instanceOf(Routine.Routine, owner) ? owner : undefined;
  });

/**
 * The sync trigger a Routine owns, read straight off its `triggers` array.
 *
 * Unlike {@link findTrigger} this needs no query, so it sees a Routine the caller just persisted — the
 * reverse-ref index lags a write, and a lookup racing it reports the Routine as missing.
 */
export const triggerOfRoutine = (routine: Routine.Routine): Trigger.Trigger | undefined =>
  routine.triggers
    .map((ref) => ref.target)
    .find((trigger): trigger is Trigger.Trigger => Obj.instanceOf(Trigger.Trigger, trigger) && !!trigger.spec);

/**
 * The space's {@link Trigger.TriggerMonitorService}. The monitor has space affinity, so it is
 * resolved through the app's {@link Capabilities.ServiceResolver} rather than taken from the ambient
 * runtime; resolution fails where no such capability exists (CLI, workerd), which is why this layer
 * carries an error channel.
 */
export const triggerMonitorLayer = (
  spaceId: Key.SpaceId,
): Layer.Layer<Trigger.TriggerMonitorService, CapabilityNotFoundError | ServiceNotAvailableError, Capability.Service> =>
  Layer.unwrap(
    Capability.get(Capabilities.ServiceResolver).pipe(
      Effect.map((resolver) =>
        ServiceResolver.provide({ space: spaceId }, Trigger.TriggerMonitorService).pipe(
          Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, resolver)),
        ),
      ),
    ),
  );

/**
 * Force-runs a sync trigger through the monitor, which routes a `remote` trigger to EDGE and a local
 * one to the trigger dispatcher — the dispatcher being what carries the run's durable execution, so
 * a batched sync continues past its first capped run. The synthetic tick stands in for the timer
 * event a scheduled fire would have supplied.
 *
 * `data` only reaches a *local* run: EDGE's force-run endpoint takes a trigger id and nothing else
 * (`EdgeTriggerManager.invokeTrigger` -> `forceRunCronTrigger(ctx, spaceId, triggerId)`), so a remote
 * trigger's run sees no event and resolves its `{{event.data.*}}` input templates to `undefined`.
 * TODO(wittjosiah): Carry the fire event to EDGE so a remote sync honours pressed-first ordering.
 */
export const fireTrigger = (
  trigger: Trigger.Trigger,
  data?: TriggerEvent.DirectEvent['data'],
): Effect.Effect<void, never, Trigger.TriggerMonitorService> =>
  Effect.gen(function* () {
    const monitor = yield* Trigger.TriggerMonitorService;
    // `data` (the pressed binding, for pressed-first ordering) rides on a `DirectEvent` so the
    // trigger's `{{event.data.*}}` input templates pick it up; the dispatcher keeps the event across
    // `runAgain` retries, so the hint survives continuation rounds.
    const event = data
      ? ({ data } satisfies TriggerEvent.DirectEvent)
      : ({ tick: Date.now() } satisfies TriggerEvent.TimerEvent);
    yield* monitor.invokeTrigger({ trigger, event });
  });

/**
 * Builds a connection's sync Routine as a fully-wired but *unpersisted* draft: one Routine per
 * account, wrapping a trigger built from the connector's declared `sync.trigger` spec — running on
 * EDGE when the connector declares `remote`, otherwise locally — bound to the connector's own sync
 * operation, whose input is the connection rather than any one binding. The operation fans out over
 * every binding at run time (see {@link syncAll}), so targets added or removed later are covered
 * without touching the Routine.
 *
 * `priority` is an event template: a manual sync from one target's button carries that binding on the
 * fire event for pressed-first ordering, while a scheduled fire resolves it to nothing. It is inert
 * for a `remote` trigger, whose fire event EDGE's force-run endpoint cannot accept — see
 * {@link fireTrigger}.
 *
 * Nothing is written here. The draft is shown editable in the create-routine form and persisted on
 * Save, so a sync Routine is never created behind the user's back — which is also why there is no
 * in-flight dedupe: two racing callers open one dialog between them rather than persisting twice.
 */
export const scaffoldRoutine = ({
  name,
  connection,
  operation,
  spec,
  remote,
}: {
  name?: string;
  connection: Connection.Connection;
  operation: Operation.Definition<ConnectorSpec.SyncInput, ConnectorSpec.SyncOutput>;
  spec: Trigger.Spec;
  remote?: boolean;
}): Routine.Routine => {
  // `remote` is left unset for a local connector rather than written as `false`, so the trigger editor
  // shows the schema default instead of a stored choice the connector never made.
  const trigger = Trigger.make({
    enabled: true,
    ...(remote ? { remote: true } : {}),
    spec,
    input: { connection: Ref.make(connection), priority: '{{event.data.priority}}' },
  });

  return makeRoutine({
    // Label the Routine after the account so several connections stay distinguishable.
    name: name ?? routineName(connection),
    // A connector's sync is statically defined and already in the registry, so the Routine refers to
    // it by key rather than persisting a copy into the space.
    spec: { kind: 'runnable', runnable: Ref.fromURI(operation.meta.key) },
    trigger,
  });
};

const routineName = (connection: Connection.Connection): string => {
  const label = Obj.getLabel(connection) ?? connection.name;
  return label ? `Sync — ${label}` : 'Sync';
};

//
// Running a sync.
//

/** How many of a connection's bindings sync at once. */
const SYNC_CONCURRENCY = 2;

/**
 * The shared fan-out every connector's sync operation wraps: resolves the connection's external-sync
 * cursors and runs `sync` for each, bounded so a manual account sync does not hit the provider with a
 * burst of requests. `priority` (a cursor id, carried by a target's sync button through the trigger
 * event) sorts that binding to the front, so the pressed target grabs a slot immediately while its
 * siblings queue.
 *
 * Isolation: every binding's outcome — output, typed failure, or defect — is collected, so one broken
 * binding neither interrupts a concurrent sibling mid-run (which could tear a feed-append from its
 * cursor advance) nor starves the queued rest. After every binding has had its turn, the worst outcome
 * is surfaced once: an auth expiry first (it is actionable), then the first failure, then the first
 * defect. HTTP 401s — arriving as typed provider failures or as defects — are retagged
 * {@link ConnectionAuthExpiredError} so the failure toast offers reauthentication.
 *
 * Continuation: a binding's `Operation.runAgain()` (a capped run with work left) is likewise collected
 * and re-raised once at the operation level — a dispatcher-driven run re-invokes the operation with
 * the same event, and the durable per-binding cursors resume where they left off. A failure outranks
 * the re-raise; the capped binding's cursor resumes on the next scheduled run regardless.
 *
 * `outputs` collects each binding's result in fan-out order, so an operation with a meaningful output
 * (new-message counts, say) can fold them.
 */
export const syncAll = <A, E, R>({
  connection: connectionRef,
  priority,
  sync: syncBinding,
}: {
  connection: Ref.Ref<Connection.Connection>;
  priority?: string | undefined;
  sync: (binding: Cursor.ExternalCursor) => Effect.Effect<A, E, R>;
}): Effect.Effect<{ synced: number; outputs: A[] }, E | ConnectionAuthExpiredError, Exclude<R, Database.Service>> =>
  Effect.gen(function* () {
    // `Database.load` resolves through the ref's own resolver, so a trigger-delivered input whose
    // target is not yet in the working set still loads; only a ref with no resolver at all cannot.
    const connection = connectionRef.isAvailable
      ? yield* Database.load(connectionRef).pipe(
          Effect.orElseSucceed((): Connection.Connection | undefined => undefined),
        )
      : undefined;
    const db = connection ? Obj.getDatabase(connection) : undefined;
    if (!connection || !db) {
      log.warn('sync skipped: connection is not resolvable', { uri: connectionRef.uri });
      return { synced: 0, outputs: [] };
    }
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run.pipe(
      Effect.provide(Database.layer(db)),
      Effect.map((results) =>
        results.filter((cursor): cursor is Cursor.ExternalCursor => isForConnection(cursor, connection)),
      ),
      Effect.orElseSucceed((): Cursor.ExternalCursor[] => []),
    );

    const ordered = priority ? [...cursors].sort((a, b) => rank(a, priority) - rank(b, priority)) : cursors;

    // Serialized invocation the reauth toast runs on click — data (operation key + input), not a live
    // callback, since it rides on the error across the process boundary.
    const openConnection = Operation.prepare(LayoutOperation.Open, {
      subject: [connectionDeckSubject(GraphPath.getSpacePath(db.spaceId), connection.id)],
      navigation: 'immediate',
    });

    const retag401 = (cause: unknown): ConnectionAuthExpiredError =>
      new ConnectionAuthExpiredError({ connectionId: connection.id, action: openConnection, cause });

    // Every binding resolves to a tagged outcome so the fan-out never fails or dies mid-flight — one
    // broken binding must not interrupt a sibling between its feed append and cursor advance. Tagged
    // (rather than sentinel `undefined`) so a `void`-returning sync's outputs survive collection.
    type Outcome =
      | { kind: 'output'; output: A }
      | { kind: 'rerun' }
      | { kind: 'failure'; failure: E | ConnectionAuthExpiredError }
      | { kind: 'defect'; defect: unknown };
    const outcomes: Outcome[] = yield* Effect.all(
      ordered.map((binding) =>
        syncBinding(binding).pipe(
          // The connection's database, resolved once above: Composer's invoker is wired without a
          // `databaseResolver`, so a per-binding sync would otherwise have no Database service.
          Effect.provide(Database.layer(db)),
          Effect.map((output): Outcome => ({ kind: 'output', output })),
          // Provider 401s reach here typed (a handler that `Effect.result`s its API calls re-fails
          // them) or as defects (a handler whose nested operation invocation `orDie`d them) — retag
          // on both channels.
          Effect.catch((error) =>
            Effect.succeed<Outcome>({ kind: 'failure', failure: isUnauthorizedError(error) ? retag401(error) : error }),
          ),
          Effect.catchDefect((defect) =>
            Effect.succeed<Outcome>(
              RunAgainError.is(defect)
                ? { kind: 'rerun' }
                : isUnauthorizedError(defect)
                  ? { kind: 'failure', failure: retag401(defect) }
                  : { kind: 'defect', defect },
            ),
          ),
        ),
      ),
      { concurrency: SYNC_CONCURRENCY },
    );

    // Auth expiry outranks other failures (it carries the reauthenticate affordance); any failure
    // outranks a continuation re-raise. Per-binding state (`Cursor.recordError`/`advance`) was already
    // stamped by the handler, so surfacing one error loses nothing durable.
    const failures = outcomes.filter((outcome): outcome is Outcome & { kind: 'failure' } => outcome.kind === 'failure');
    const failure = failures.find((outcome) => outcome.failure instanceof ConnectionAuthExpiredError) ?? failures.at(0);
    if (failure) {
      return yield* Effect.fail(failure.failure);
    }
    const defect = outcomes.find((outcome): outcome is Outcome & { kind: 'defect' } => outcome.kind === 'defect');
    if (defect) {
      return yield* Effect.die(defect.defect);
    }
    if (outcomes.some((outcome) => outcome.kind === 'rerun')) {
      // `runAgain` raises a defect; `orDie` collapses its phantom `void` error type.
      return yield* Operation.runAgain().pipe(Effect.orDie);
    }

    return {
      synced: cursors.length,
      outputs: outcomes.flatMap((outcome) => (outcome.kind === 'output' ? [outcome.output] : [])),
    };
  });

/** Priority cursor first; otherwise keep query order. */
const rank = (cursor: Cursor.ExternalCursor, priority: string): number => (cursor.id === priority ? 0 : 1);

/**
 * Runs a connection's sync, by whichever path its connector declares.
 *
 * A connector with a `sync.trigger` spec is kept in sync by the connection's Routine, so the sync is
 * run by force-running that Routine's trigger — the dispatcher is what drives the run, including
 * `Operation.runAgain()` continuation, so a capped run finishes its remaining batches. `priority` (a
 * binding's cursor id) rides on the fire event for pressed-first ordering. Routines are only created
 * through the create-routine form, never silently: when the connection has none (deleted, or declined
 * at creation) this fails with {@link SyncRoutineMissingError} so a UI caller can offer the seeded form
 * (see {@link syncOrOfferRoutine}). A connector with no trigger spec syncs on demand only: its sync
 * operation is invoked directly, accepting that a capped run's remaining batches wait (nothing drives
 * continuation outside the dispatcher).
 */
export const runSync = ({
  connection,
  connector,
  spaceId,
  priority,
}: {
  connection: Connection.Connection;
  connector: ConnectorSpec.ConnectorEntry;
  spaceId: Key.SpaceId;
  priority?: string;
}): Effect.Effect<
  void,
  ConnectionSyncError | SyncRoutineMissingError,
  Database.Service | Operation.Service | Capability.Service
> =>
  Effect.gen(function* () {
    const syncSpec = connector.sync;
    if (!syncSpec) {
      return;
    }

    if (!syncSpec.trigger) {
      return yield* Operation.invoke(
        syncSpec.operation,
        { connection: Ref.make(connection), priority },
        { spaceId },
      ).pipe(
        Effect.asVoid,
        // Continuation is dispatcher-driven; a direct invocation surfaces `runAgain` as a defect.
        // Accept the partial sync — an on-demand connector's next manual sync resumes the cursor.
        Effect.catchDefect((defect) =>
          RunAgainError.is(defect)
            ? Effect.sync(() => log.info('sync capped; more on next run', { connectorId: connector.id }))
            : Effect.die(defect),
        ),
      );
    }

    const trigger = yield* findTrigger(connection);
    if (!trigger) {
      return yield* Effect.fail(new SyncRoutineMissingError({ connectorId: connector.id }));
    }

    yield* fireTrigger(trigger, priority ? { priority } : undefined).pipe(Effect.provide(triggerMonitorLayer(spaceId)));
  }).pipe(
    // A missing sync handler or an unresolvable trigger monitor both mean the sync never started; the
    // connector is the only context a caller can act on. The missing-routine signal stays distinct so
    // callers can offer the create-routine form instead of reporting a failure.
    Effect.mapError((cause) =>
      cause instanceof SyncRoutineMissingError ? cause : new ConnectionSyncError({ connectorId: connector.id, cause }),
    ),
  );

/**
 * {@link runSync} with the sync button's recreation path: when the account's sync Routine is missing
 * (deleted, or declined at creation), the seeded create-routine form opens instead — over `subject` (a
 * bound target, or the connection itself) — and saving it runs the sync the press asked for.
 * Cancelling runs nothing. Shared by every sync affordance: a target's sync button, the connection
 * article, and the connection's nav-tree action.
 */
export const syncOrOfferRoutine = ({
  connection,
  connector,
  db,
  priority,
  subject,
}: {
  connection: Connection.Connection;
  connector: ConnectorSpec.ConnectorEntry;
  db: Database.Database;
  priority?: string;
  subject?: Obj.Unknown;
}): Effect.Effect<void, ConnectionSyncError, Capability.Service | Operation.Service> =>
  runSync({ connection, connector, spaceId: db.spaceId, priority }).pipe(
    Effect.catchTag('SyncRoutineMissingError', () =>
      Effect.gen(function* () {
        const invoker = yield* Operation.Service;
        const capabilities = yield* Capability.Service;
        const result = yield* invoker.invoke(SpaceOperation.OpenObjectForm, {
          target: db,
          typename: Type.getTypename(Routine.Routine),
          defaults: { templateId: SyncTemplate.ID, subject: subject ?? connection },
          navigable: false,
        });
        const created = result?.target;
        if (created) {
          // Forked, not yielded: the offer is done once the routine exists, and the caller waited
          // for the dialog already — it should not also wait out the first sync.
          Effect.runFork(
            syncCreatedRoutine({ created, connector, spaceId: db.spaceId, priority }).pipe(
              Effect.provideService(Operation.Service, invoker),
              Effect.provideService(Capability.Service, capabilities),
              Effect.catch((error) => Effect.sync(() => log.warn('sync after routine created failed', { error }))),
              // An EDGE force-run that outlives its replication backoff arrives as a defect
              // (`Effect.orDie`), which the typed catch above would let escape unreported.
              Effect.catchDefect((defect) =>
                Effect.sync(() => log.warn('sync after routine created died', { defect })),
              ),
            ),
          );
        }
      }).pipe(Effect.catch((error) => Effect.sync(() => log.warn('offer sync routine failed', { error })))),
    ),
    Effect.provide(Database.layer(db)),
  );

/**
 * Runs the sync the user asked for by saving the offered create-routine form — the Sync button's
 * recreation path and the connect flow's dialog both land here.
 *
 * The trigger comes off the created Routine rather than from a lookup: the reverse-ref index lags the
 * write, so {@link findTrigger} called this early reports the Routine as missing — which is what
 * silently dropped this sync. Nothing re-opens the dialog from here either; a save that somehow
 * produced no trigger logs and stops, rather than looping the user back into the form.
 */
export const syncCreatedRoutine = ({
  created,
  connector,
  spaceId,
  priority,
}: {
  created: Obj.Unknown;
  connector: ConnectorSpec.ConnectorEntry;
  spaceId: Key.SpaceId;
  priority?: string;
}): Effect.Effect<void, ConnectionSyncError, Capability.Service> =>
  Effect.gen(function* () {
    const trigger = Obj.instanceOf(Routine.Routine, created) ? triggerOfRoutine(created) : undefined;
    if (!trigger) {
      log.warn('saved routine carries no sync trigger; nothing to run', { connectorId: connector.id });
      return;
    }

    yield* fireTrigger(trigger, priority ? { priority } : undefined).pipe(
      Effect.provide(triggerMonitorLayer(spaceId)),
      Effect.mapError((cause) => new ConnectionSyncError({ connectorId: connector.id, cause })),
    );
  });

/**
 * Syncs a single sync target (a Mailbox, Calendar, …) by way of its binding's connection: the
 * account's sync Routine runs with the pressed binding as `priority`, so this target syncs first while
 * its siblings queue behind it. No-op for an object that is not bound to a live connection.
 *
 * When the account's sync Routine is missing, the seeded create-routine form opens instead and saving
 * runs the sync — see {@link syncOrOfferRoutine}.
 */
export const sync = (
  target: Obj.Unknown,
): Effect.Effect<void, ConnectionSyncError, Capability.Service | Operation.Service> =>
  Effect.gen(function* () {
    const db = Obj.getDatabase(target);
    if (!db) {
      return;
    }

    yield* Effect.gen(function* () {
      const binding = yield* query(target);
      if (!binding) {
        return;
      }

      const { cursor, connection } = binding;
      const connectors = (yield* Capability.getAll(ConnectorSpec.Connector)).flat();
      const connector = connectors.find((entry) => entry.id === connection.connectorId);
      if (!connector) {
        return;
      }

      yield* syncOrOfferRoutine({ connection, connector, db, priority: cursor.id, subject: target });
    }).pipe(
      Effect.provide(Database.layer(db)),
      // Resolving the binding and its connector can fail the same way the sync itself can, so the
      // caller sees one error type either way.
      Effect.mapError((error) =>
        error instanceof ConnectionSyncError ? error : new ConnectionSyncError({ cause: error }),
      ),
    );
  });

//
// Lifecycle: suspend, resume, refuse, remove.
//

/**
 * Removes a dormant binding, plus any per-binding sync Routine still pointed at it. The Routine owns its
 * trigger, so removing it takes the trigger too. An account-level Routine is not reached from here — it
 * references the connection, never the cursor, so it is removed with the connection (see
 * {@link findRoutine}).
 */
export const remove = (cursor: Cursor.ExternalCursor): Effect.Effect<void, never, Database.Service> =>
  Effect.gen(function* () {
    const routines = yield* Database.query(
      Query.select(Filter.id(cursor.id)).referencedBy(Trigger.Trigger).referencedBy(Routine.Routine, 'triggers'),
    ).run;
    for (const routine of routines) {
      yield* Database.remove(routine);
    }
    yield* Database.remove(cursor);
  });

export type PrepareOptions = {
  /** Object being bound (Mailbox, Calendar, …). */
  target: Obj.Unknown;
  /** Credential the connection authenticates with; its `source` keys the target's account record. */
  accessToken: AccessToken.AccessToken;
  /** Reference to the same credential, written onto a resumed cursor. */
  source: Ref.Ref<AccessToken.AccessToken>;
  /** Remote target id, when the connector binds several (calendars, boards); must also match to resume. */
  externalId?: string;
};

/**
 * Settles what a target's existing state means for a new binding, and records the account it is now
 * synced from. Returns the cursor the caller should use, or `undefined` when it should create a fresh
 * one. Fails with {@link TargetAccountMismatchError} — before mutating anything — when the target
 * already syncs a different account.
 *
 * Resuming is gated on the account rather than on the target alone because the cursor is a resume
 * position, not just an association: `max` is a provider timestamp, so inheriting another account's
 * watermark would leave every message older than it unfetched, silently.
 */
export const prepare = ({
  target,
  accessToken,
  source,
  externalId,
}: PrepareOptions): Effect.Effect<Cursor.ExternalCursor | undefined, TargetAccountMismatchError, Database.Service> =>
  Effect.gen(function* () {
    const account = accessToken.account;
    // Read the record before comparing so the refusal narrows both values by control flow; a
    // `checkAccount` verdict alone would leave them optional at the call site.
    const recorded = readAccount(target, accessToken.source);
    if (recorded !== undefined && account !== undefined && recorded !== account) {
      return yield* Effect.fail(
        new TargetAccountMismatchError({ targetId: target.id, expected: recorded, actual: account }),
      );
    }
    const confirmed = recorded !== undefined && account !== undefined;

    const orphaned = yield* queryDormant(target);
    // Scoped to the remote target being bound: a dormant cursor carrying no `externalId` is a
    // single-target binding, not a wildcard, so a multi-target connector must not inherit its `max` for
    // an arbitrary calendar or board — that watermark is a provider timestamp, and everything older than
    // it would stay unfetched.
    const forThisTarget = (cursor: Cursor.ExternalCursor) =>
      externalId === undefined ? cursor.spec.externalId === undefined : cursor.spec.externalId === externalId;
    // Only a confirmed account may inherit progress; an unrecorded one starts over.
    const adopted = confirmed ? orphaned.find(forThisTarget) : undefined;
    // Confined to the confirmed path: an unrecorded account (every target bound before accounts were
    // recorded) declines to inherit progress, but discarding it would force a full re-walk.
    if (confirmed) {
      for (const cursor of orphaned) {
        // Only a duplicate for the *same* remote target is cleaned up; another target's progress, and a
        // single-target cursor this multi-target bind declined to adopt, are left where they are.
        if (cursor !== adopted && forThisTarget(cursor)) {
          yield* remove(cursor);
        }
      }
    }

    if (account !== undefined) {
      recordAccount(target, accessToken.source, account);
    }
    if (!adopted) {
      return undefined;
    }

    Cursor.rebindSource(adopted, source);
    // No schedule is restored here: the sync Routine belongs to the connection, and a re-connect binds
    // a *new* one, so the account has no Routine until the user saves the create-routine form the next
    // sync affordance offers them.
    log.info('resumed dormant binding', { account, target: target.id, max: adopted.max });
    return adopted;
  });

/**
 * Tells the user why a completed sign-in bound nothing. The credential is real and the connection is
 * kept — only the binding is refused — so without this the flow looks like it simply did nothing. The
 * accounts themselves are not named: a `Label` carries no interpolation params, and the log has them.
 */
export const reportAccountMismatch: Effect.Effect<void, never, Operation.Service> = Effect.ignore(
  Operation.invoke(LayoutOperation.AddToast, {
    id: `${meta.profile.key}.account-mismatch`,
    icon: 'ph--warning--regular',
    title: ['account-mismatch.title', { ns: meta.profile.key }],
    description: ['account-mismatch.description', { ns: meta.profile.key }],
  }),
);

/**
 * Bind `target` to an existing `connection` as a sync target: an external cursor authenticated by
 * the connection's access token, plus the recurring sync trigger the connector declares. Binding is
 * always a deliberate act — the connector-auth menu's reuse entry, or the coordinator completing a
 * sign-in — so nothing calls this on a user's behalf.
 */
export const bind = ({
  connection,
  connector,
  target,
}: {
  connection: Connection.Connection;
  connector: ConnectorSpec.ConnectorEntry | undefined;
  target: Ref.Ref<Obj.Unknown>;
}): Effect.Effect<Cursor.ExternalCursor, TargetAccountMismatchError, Database.Service> =>
  Effect.gen(function* () {
    const object = yield* Database.load(target).pipe(Effect.orDie);
    const accessToken = yield* Database.load(connection.accessToken).pipe(Effect.orDie);
    // Settled first: a target that syncs another account is refused before anything is written.
    const adopted = yield* prepare({
      target: object,
      accessToken,
      source: connection.accessToken,
    });
    const name = accessToken.account;
    if (name) {
      Obj.update(object, (object) => Obj.setLabel(object, name));
    }
    if (adopted) {
      return adopted;
    }
    const cursor = yield* Database.add(Cursor.makeExternal({ source: connection.accessToken, target }));
    invariant(Cursor.isExternal(cursor));
    return cursor;
  });
