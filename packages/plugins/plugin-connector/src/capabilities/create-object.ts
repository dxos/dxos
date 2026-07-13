//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Database, Obj, Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { Connection } from '@dxos/types';

import { ConnectorCoordinator, CreateConnectionForm } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Connection.Connection),
      inputSchema: CreateConnectionForm,
      createObject: (props: { connectorId: string }, options) =>
        Effect.gen(function* () {
          const db = Database.isDatabase(options.target) ? options.target : Obj.getDatabase(options.target);
          if (!db) {
            return yield* Effect.fail(new Error('No database for create target'));
          }

          const coordinator = yield* Capability.get(ConnectorCoordinator);
          const result = yield* coordinator.createConnection({
            db,
            spaceId: db.spaceId,
            connectorId: props.connectorId,
          });

          const id =
            result.kind === 'oauth-started'
              ? result.draftConnectionId
              : result.kind === 'connection-created'
                ? result.connectionId
                : '';

          return {
            id,
            subject: [],
            // The connection is created asynchronously by the coordinator (OAuth popup /
            // credential dialog), so no object exists at return time; the contract requires one.
            object: undefined as unknown as Obj.Unknown,
          };
        }),
    });
  }),
);
