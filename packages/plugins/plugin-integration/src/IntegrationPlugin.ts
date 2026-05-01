//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Database, Obj } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client/types';
import { type CreateObject } from '@dxos/plugin-space/types';
import { AccessToken } from '@dxos/types';

import { AppGraphBuilder, BuiltinProviders, Coordinator, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';

import { IntegrationCoordinator } from './capabilities';
import { translations } from './translations';
import { CreateIntegrationForm, Integration } from './types';

export const IntegrationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Integration.Integration.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Integration.Integration).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Integration.Integration).pipe(Option.getOrThrow).hue ?? 'cyan',
          inputSchema: CreateIntegrationForm,
          createObject: ((props: { providerId: string }, options) =>
            Effect.gen(function* () {
              const db = Database.isDatabase(options.target) ? options.target : Obj.getDatabase(options.target);
              if (!db) {
                return yield* Effect.fail(new Error('No database for create target'));
              }

              const coordinator = yield* Capability.get(IntegrationCoordinator);
              const { integrationId } = yield* coordinator.createIntegration({
                db,
                spaceId: db.spaceId,
                providerId: props.providerId,
              });

              return {
                id: integrationId,
                subject: [],
                object: undefined as unknown as Obj.Unknown,
              };
            })) satisfies CreateObject,
        },
      },
    ],
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [AccessToken.AccessToken, Integration.Integration] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupAppGraph,
    activate: BuiltinProviders,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ClientEvents.ClientReady, ActivationEvents.OperationInvokerReady),
    activate: Coordinator,
  }),
  Plugin.make,
);
