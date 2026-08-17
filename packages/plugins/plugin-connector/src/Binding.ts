//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trigger from '@dxos/compute/Trigger';
import type * as TriggerEvent from '@dxos/compute/TriggerEvent';
import { Database, EID, Filter, type Key, Obj, Query, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type AccessToken, Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { connectedRoutinesQuery, makeRoutine } from '@dxos/plugin-routine';

import { meta } from '#meta';
import { ConnectorSpec } from '#types';

import { ConnectionSyncError, TargetAccountMismatchError } from './errors';

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
 * Finds the sync trigger bound to `cursor`: a sync Routine's trigger carries the cursor as its
 * `input.binding`, so the reverse-ref from the cursor reaches it whether or not a Routine owns it.
 */
export const findTrigger = (cursor: Cursor.ExternalCursor) =>
  Effect.gen(function* () {
    const triggers = yield* Database.query(Query.select(Filter.id(cursor.id)).referencedBy(Trigger.Trigger)).run;
    return triggers.find((trigger) => !!trigger.spec);
  });

/**
 * Enables or disables the sync trigger of `cursor`'s Routine, reporting whether one was found. A
 * binding whose connection is deleted keeps its cursor (its progress outlives the credential) but must
 * stop firing, or every scheduled run reports a missing-credential failure until the target is re-bound.
 */
export const setTriggerEnabled = (
  cursor: Cursor.ExternalCursor,
  enabled: boolean,
): Effect.Effect<boolean, never, Database.Service> =>
  Effect.gen(function* () {
    const trigger = yield* findTrigger(cursor);
    if (!trigger) {
      return false;
    }
    Obj.update(trigger, (trigger) => {
      trigger.enabled = enabled;
    });
    return true;
  });

/**
 * The space's {@link Trigger.TriggerMonitorService}. The monitor has space affinity, so it is
 * resolved through the app's {@link Capabilities.ServiceResolver} rather than taken from the ambient
 * runtime; resolution fails where no such capability exists (CLI, workerd), which is why this layer
 * carries an error channel.
 */
export const triggerMonitorLayer = (
  spaceId: Key.SpaceId,
): Layer.Layer<Trigger.TriggerMonitorService, Error, Capability.Service> =>
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
 */
export const fireTrigger = (trigger: Trigger.Trigger): Effect.Effect<void, never, Trigger.TriggerMonitorService> =>
  Effect.gen(function* () {
    const monitor = yield* Trigger.TriggerMonitorService;
    yield* monitor.invokeTrigger({ trigger, event: { tick: Date.now() } satisfies TriggerEvent.TimerEvent });
  });

/**
 * Creates the sync Routine for `cursor`: a Routine wrapping a trigger built from the connector's
 * declared `sync.trigger` spec — running on EDGE when the connector declares `syncSpec.remote`, otherwise
 * locally — wired to the connector's sync operation with `binding` bound to `cursor`. `input` carries
 * only `binding`, matching the sync operation's input schema — the routine is related to `target` by
 * query ({@link connectedRoutinesQuery}, surfaced in the routines companion), which reaches it through
 * `binding` → the cursor → the cursor's `spec.target`, so no target ref is smuggled into the operation
 * input. Returns the existing trigger instead when a sync routine is already connected to `target`.
 */
/**
 * Creation in flight, keyed by binding. The existence check below is an index query, so it cannot see
 * a Routine added moments earlier — without this, callers racing on one binding each observe none and
 * persist a schedule, syncing it twice a period. Process-local: a second peer racing needs the
 * one-routine-per-binding invariant at the data layer.
 */
const creating = new Map<string, Deferred.Deferred<Trigger.Trigger>>();

export const createRoutine = ({
  target,
  cursor,
  operation,
  spec,
  remote,
}: {
  target: Obj.Unknown;
  cursor: Cursor.ExternalCursor;
  operation: Operation.Definition<ConnectorSpec.SyncInput, ConnectorSpec.SyncOutput>;
  spec: Trigger.Spec;
  remote?: boolean;
}): Effect.Effect<Trigger.Trigger, never, Database.Service> =>
  // Claimed synchronously, before the first yield point, so no caller can interleave between the
  // lookup and the claim.
  Effect.suspend(() => {
    const inFlight = creating.get(cursor.id);
    if (inFlight) {
      return Deferred.await(inFlight);
    }

    const deferred = Deferred.makeUnsafe<Trigger.Trigger>();
    creating.set(cursor.id, deferred);
    return addRoutine({ target, cursor, operation, spec, remote }).pipe(
      // Waiters see the same outcome, including a defect, rather than hanging on the deferred.
      Effect.onExit((exit) => Deferred.done(deferred, exit)),
      Effect.ensuring(Effect.sync(() => creating.delete(cursor.id))),
    );
  });

const addRoutine = ({
  target,
  cursor,
  operation,
  spec,
  remote,
}: {
  target: Obj.Unknown;
  cursor: Cursor.ExternalCursor;
  operation: Operation.Definition<ConnectorSpec.SyncInput, ConnectorSpec.SyncOutput>;
  spec: Trigger.Spec;
  remote?: boolean;
}): Effect.Effect<Trigger.Trigger, never, Database.Service> =>
  Effect.gen(function* () {
    const connected = yield* Database.query(connectedRoutinesQuery(target)).run;
    for (const routine of connected) {
      const existingTrigger = routine.triggers.find((ref) => ref.target?.spec?.kind === spec.kind)?.target;
      if (existingTrigger) {
        return existingTrigger;
      }
    }

    // `remote` is left unset for a local connector rather than written as `false`, so the trigger
    // editor shows the schema default instead of a stored choice the connector never made.
    const trigger = Trigger.make({
      enabled: true,
      ...(remote ? { remote: true } : {}),
      spec,
      input: { binding: Ref.make(cursor) },
    });

    const routine = makeRoutine({
      name: 'Sync',
      // A connector's sync is statically defined and already in the registry, so the routine refers to
      // it by key rather than persisting a copy of it into the space.
      spec: { kind: 'runnable', runnable: Ref.fromURI(operation.meta.key) },
      trigger,
    });

    yield* Database.add(routine);
    return trigger;
  });

/**
 * The trigger of `cursor`'s sync Routine, creating the Routine when the binding has none yet.
 * `undefined` when the connector declares no `sync.trigger` — such a connector syncs on demand only,
 * so its sync operation is invoked directly instead of through a trigger.
 */
export const ensureTrigger = ({
  connector,
  cursor,
}: {
  connector: ConnectorSpec.ConnectorEntry;
  cursor: Cursor.ExternalCursor;
}): Effect.Effect<Trigger.Trigger | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const syncSpec = connector.sync;
    if (!syncSpec?.trigger) {
      return undefined;
    }
    const existing = yield* findTrigger(cursor);
    if (existing) {
      return existing;
    }
    // A binding whose target ref no longer resolves is broken beyond what routine setup can fix, and
    // a scheduled connector has no direct-sync path to fall back to.
    const target = yield* Database.load(cursor.spec.target).pipe(Effect.orDie);
    return yield* createRoutine({
      target,
      cursor,
      operation: syncSpec.operation,
      spec: syncSpec.trigger,
      remote: syncSpec.remote,
    });
  });

//
// Running a sync.
//

/**
 * Syncs one binding, by whichever path its connector declares.
 *
 * A connector with a `sync.trigger` spec is kept in sync by a Routine, so its binding is always
 * synced by force-running that Routine's trigger — creating the Routine first when the binding has
 * none yet — because the dispatcher is what drives the run, including `Operation.runAgain()`
 * continuation, so a capped run finishes its remaining batches. A connector with no trigger spec
 * syncs on demand only, and its operation is invoked directly.
 */
export const runSync = ({
  spaceId,
  connector,
  cursor,
}: {
  spaceId: Key.SpaceId;
  connector: ConnectorSpec.ConnectorEntry;
  cursor: Cursor.ExternalCursor;
}): Effect.Effect<void, ConnectionSyncError, Database.Service | Operation.Service | Capability.Service> =>
  Effect.gen(function* () {
    const syncSpec = connector.sync;
    if (!syncSpec) {
      return;
    }

    const trigger = yield* ensureTrigger({ connector, cursor });
    if (!trigger) {
      // TODO(wittjosiah): Invokes the sync once; nothing drives `Operation.runAgain()` continuation
      //   without a trigger, so a capped run's remaining batches are not synced here.
      return yield* Operation.invoke(syncSpec.operation, { binding: Ref.make(cursor) }, { spaceId }).pipe(
        Effect.asVoid,
      );
    }

    yield* fireTrigger(trigger).pipe(Effect.provide(triggerMonitorLayer(spaceId)));
  }).pipe(
    // A missing sync handler or an unresolvable trigger monitor both mean the sync never started;
    // the connector is the only context a caller can act on.
    Effect.mapError((cause) => new ConnectionSyncError({ connectorId: connector.id, cause })),
  );

/**
 * Syncs a single sync target (a Mailbox, Calendar, …) by way of its binding: a plain Effect rather
 * than a registered Operation, since it only resolves which binding and connector the target belongs
 * to and hands off to {@link runSync}. No-op for an object that is not bound to a connection.
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

      yield* runSync({ connector, cursor, spaceId: db.spaceId });
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
 * Removes a dormant binding and the sync Routine driving it. The Routine owns its trigger, so removing
 * it takes the trigger too; leaving either behind would keep a schedule pointed at a cursor that is
 * gone, and would shadow the target's new Routine (a sync Routine is matched to its target *through*
 * the cursor).
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
  /** Connector being bound, used to restore a resumed binding's sync Routine. */
  connector?: ConnectorSpec.ConnectorEntry;
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
  connector,
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
    // Only a confirmed account may inherit progress; an unrecorded one starts over.
    const adopted = confirmed
      ? orphaned.find(
          (cursor) =>
            externalId === undefined || cursor.spec.externalId === undefined || cursor.spec.externalId === externalId,
        )
      : undefined;
    // Removal is confined to the confirmed path: declining to inherit an unrecorded account's progress
    // is right, but discarding it is not — every target bound before accounts were recorded reads as
    // unrecorded, so deleting here would re-walk the whole horizon on its first reconnect, the exact
    // cost this dormant-binding design exists to avoid. `find` already ignores them.
    if (confirmed) {
      for (const cursor of orphaned) {
        if (cursor !== adopted) {
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
    // Restores the schedule suspended at disconnect; creates one if the connector gained a trigger spec
    // (or the Routine was removed) while the binding lay dormant.
    if (connector) {
      yield* ensureTrigger({ connector, cursor: adopted });
      yield* setTriggerEnabled(adopted, true);
    }
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
 * the connection's access token, plus the recurring sync trigger the connector declares. Shared by
 * the connector-auth menu's reuse entry and {@link autoBind} so a binding made
 * either way is identical.
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
      connector,
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
    if (connector) {
      yield* ensureTrigger({ connector, cursor });
    }
    return cursor;
  });

/**
 * Bind `target` to the one connection already authorized for its type, if there is exactly one.
 *
 * A freshly created bindable object (a Mailbox, a Calendar) is inert until something binds it, and
 * when the user has a single account authorized for that type there is nothing to choose — making
 * them pick it from the Connect menu is a step with one possible outcome. Ambiguity is left to the
 * user: with no connection there is nothing to bind, and with several the choice is real, so both
 * fall through to the Connect action.
 *
 * Returns the cursor when it binds, `undefined` otherwise.
 */
export const autoBind = ({
  target,
}: {
  target: Obj.Unknown;
}): Effect.Effect<Cursor.ExternalCursor | undefined, never, Database.Service | Capability.Service> =>
  Effect.gen(function* () {
    const capabilities = yield* Capability.Service;
    const connectorIds = ConnectorSpec.idsForTarget(target, capabilities);
    if (connectorIds.length === 0) {
      return undefined;
    }

    const connections = (yield* Database.query(Filter.type(Connection.Connection)).run).filter(
      (connection) => connection.connectorId !== undefined && connectorIds.includes(connection.connectorId),
    );
    if (connections.length !== 1) {
      log.info('not auto-binding', { typename: Obj.getTypename(target), candidates: connections.length });
      return undefined;
    }

    const [connection] = connections;
    const connector = capabilities
      .getAll(ConnectorSpec.Connector)
      .flat()
      .find((entry) => entry.id === connection.connectorId);
    // Automatic, so a target already synced from another account is skipped silently rather than
    // reported — there was no user action to explain a toast.
    const cursor = yield* bind({ connection, connector, target: Ref.make(target) }).pipe(
      Effect.catchTag('TargetAccountMismatchError', (error) =>
        Effect.sync(() => {
          log.info('not auto-binding: target syncs another account', { context: error.context });
          return undefined;
        }),
      ),
    );
    if (cursor) {
      log.info('auto-bound to the only authorized connection', {
        typename: Obj.getTypename(target),
        connectorId: connection.connectorId,
      });
    }
    return cursor;
  });
