//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

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
import { Integration, IntegrationProviderAnnotationId } from './types';

/**
 * Form schema for the create-Integration dialog. The `providerId` field is
 * tagged with {@link IntegrationProviderAnnotationId}; a `role: 'form-input'`
 * Surface contributed by this plugin reads currently-registered
 * `IntegrationProvider` capabilities and renders a dropdown.
 */
const CreateIntegrationForm = Schema.Struct({
  providerId: Schema.String.annotations({
    title: 'Service',
    [IntegrationProviderAnnotationId]: true,
  }),
});

/**
 * `createObject` for Integration. Delegates the full lifecycle to
 * {@link IntegrationCoordinator.createIntegration}: stubs are built in
 * memory and the OAuth popup is opened immediately, but nothing lands in
 * the database until the OAuth callback succeeds. The dialog closes and
 * navigation to the new Integration is handled by the coordinator after
 * persistence.
 *
 * Returns `subject: []` so the dialog doesn't try to navigate to an object
 * that hasn't been persisted yet — `CreateObjectDialog` skips navigation
 * when subject is empty.
 */
const createIntegration: CreateObject = (props: { providerId: string }, options) =>
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

    // The integration object isn't in the database yet (the coordinator
    // persists it after OAuth completes). Return a sentinel so the dialog
    // closes without navigating; the coordinator will navigate once the
    // integration is real.
    return {
      id: integrationId,
      subject: [],
      object: undefined as unknown as Obj.Unknown,
    };
  });

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
          createObject: createIntegration,
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
