//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import { type TargetAccountMismatchError } from '../errors';
import * as ConnectorSpec from '../types/ConnectorSpec';
import { isTargetAccountMismatch, prepareTargetBinding } from './binding-lifecycle';
import { ensureSyncTrigger } from './sync-routine';
import { connectorIdsForTarget } from './target-connectors';

/**
 * Bind `target` to an existing `connection` as a sync target: an external cursor authenticated by
 * the connection's access token, plus the recurring sync trigger the connector declares. Shared by
 * the connector-auth menu's reuse entry and {@link autoBindSingleConnection} so a binding made
 * either way is identical.
 */
export const bindConnectionToTarget = ({
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
    const adopted = yield* prepareTargetBinding({
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
      yield* ensureSyncTrigger({ connector, cursor });
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
export const autoBindSingleConnection = ({
  target,
}: {
  target: Obj.Unknown;
}): Effect.Effect<Cursor.ExternalCursor | undefined, never, Database.Service | Capability.Service> =>
  Effect.gen(function* () {
    const capabilities = yield* Capability.Service;
    const connectorIds = connectorIdsForTarget(target, capabilities);
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
    const cursor = yield* bindConnectionToTarget({ connection, connector, target: Ref.make(target) }).pipe(
      Effect.catchIf(isTargetAccountMismatch, (error) =>
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
