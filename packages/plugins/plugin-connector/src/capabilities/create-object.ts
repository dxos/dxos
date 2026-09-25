//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Type } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { CreateConnectionPanel } from '#create-panel';
import { ConnectorCoordination } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Connection.Connection),
      // A custom panel rather than an `inputSchema`: the fields to show depend on which connector is
      // picked, which a single static schema cannot express. It also collapses what used to be two
      // dialogs — service picker, then credentials — into one.
      customPanel: CreateConnectionPanel,
      createObject: (props: { connectorId: string; values?: unknown }, options) =>
        Effect.gen(function* () {
          const { db } = options;

          // Read on demand (invoked from the create-object form submit, not module activation) so
          // this module doesn't need to declare a static dependency on the coordinator.
          const coordinator = yield* Capability.get(ConnectorCoordination.ConnectorCoordinator);

          // With values in hand the credential form has already been filled, so go straight to the
          // submit path; `createConnection` would re-open the dialog the panel just replaced. It
          // still handles the OAuth-preflight connectors, whose form yields a `loginHint`.
          const result = yield* props.values === undefined
            ? coordinator.createConnection({ db, spaceId: db.spaceId, connectorId: props.connectorId })
            : coordinator.submitCredentialForm({
                db,
                spaceId: db.spaceId,
                connectorId: props.connectorId,
                values: props.values,
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
            // The connection may still be created asynchronously by the coordinator (OAuth popup),
            // in which case no object exists at return time.
            object: undefined,
          };
        }),
    });
  }),
);
