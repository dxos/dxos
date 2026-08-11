//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import * as Connection from '../types/Connection';
import * as ConnectorSpec from '../types/ConnectorSpec';
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
}): Effect.Effect<Cursor.ExternalCursor, never, Database.Service> =>
  Effect.gen(function* () {
    const object = yield* Database.load(target);
    const accessToken = yield* Database.load(connection.accessToken);
    const name = accessToken.account;
    if (name) {
      Obj.update(object, (object) => Obj.setLabel(object, name));
    }
    const cursor = yield* Database.add(Cursor.makeExternal({ source: connection.accessToken, target }));
    invariant(Cursor.isExternal(cursor));
    if (connector) {
      yield* ensureSyncTrigger({ connector, cursor });
    }
    return cursor;
  }).pipe(Effect.orDie);

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
    const cursor = yield* bindConnectionToTarget({ connection, connector, target: Ref.make(target) });
    log.info('auto-bound to the only authorized connection', {
      typename: Obj.getTypename(target),
      connectorId: connection.connectorId,
    });
    return cursor;
  });
