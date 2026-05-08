//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Database, Obj } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client/types';
import { SpaceCapabilities, type CreateObject } from '@dxos/plugin-space/types';
import { AccessToken } from '@dxos/types';

import { AppGraphBuilder, BuiltinProviders, Coordinator, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { CreateIntegrationForm, Integration, IntegrationCoordinator } from '#types';

import { translations } from './translations';

export const IntegrationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    // TODO(wittjosiah): Find a better place to fire this event.
    firesBeforeActivation: [AppActivationEvents.SetupIntegrationProviders],
    activate: AppGraphBuilder,
  }),
  Plugin.addModule({
    id: 'create-object',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Integration.Integration.typename,
        inputSchema: CreateIntegrationForm,
        createObject: ((props: { providerId: string }, options) =>
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
          })) satisfies CreateObject,
      });
    }),
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [AccessToken.AccessToken, Integration.Integration] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupIntegrationProviders,
    activate: BuiltinProviders,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ClientEvents.ClientReady, ActivationEvents.OperationInvokerReady),
    activate: Coordinator,
  }),
  Plugin.make,
);

export default IntegrationPlugin;
