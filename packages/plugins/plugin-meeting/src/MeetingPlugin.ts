//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, Capability, Common, Plugin } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import {
  AppGraphBuilder,
  CallExtension,
  IntentResolver,
  MeetingSettings,
  MeetingState,
  OperationResolver,
  ReactSurface,
  Repair,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Meeting, MeetingOperation } from './types';

export const MeetingPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: MeetingSettings,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: ActivationEvent.oneOf(Common.ActivationEvent.SetupSettings, Common.ActivationEvent.SetupAppGraph),
    activate: MeetingState,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Meeting.Meeting),
      metadata: {
        label: (object: Meeting.Meeting) => object.name || new Date(object.created).toLocaleString(),
        icon: 'ph--note--regular',
        iconHue: 'rose',
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Meeting.Meeting], id: 'schemas' }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: (context) =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) => {
          const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
          return invoke(MeetingOperation.OnCreateSpace, params);
        }),
      ),
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.SpacesReady,
    activate: Repair,
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(Common.ActivationEvent.SettingsReady, ClientEvents.ClientReady),
    activate: CallExtension,
  }),
  Plugin.make,
);
