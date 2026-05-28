//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Database, Obj, Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { CreateIntegrationForm, Integration, IntegrationCoordinator } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Integration.Integration),
      inputSchema: CreateIntegrationForm,
      createObject: (props: { providerId: string }, options) =>
        Effect.gen(function* () {
          const db = Database.isDatabase(options.target) ? options.target : Obj.getDatabase(options.target);
          if (!db) {
            return yield* Effect.fail(new Error('No database for create target'));
          }

          const coordinator = yield* Capability.get(IntegrationCoordinator);
          const result = yield* coordinator.createIntegration({
            db,
            spaceId: db.spaceId,
            providerId: props.providerId,
          });

          const id =
            result.kind === 'oauth-started'
              ? result.draftIntegrationId
              : result.kind === 'integration-created'
                ? result.integrationId
                : '';

          return {
            id,
            subject: [],
            object: undefined as unknown as Obj.Unknown,
          };
        }),
    });
  }),
);
