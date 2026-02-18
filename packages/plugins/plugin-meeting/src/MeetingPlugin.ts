//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import {
  AppGraphBuilder,
  CallExtension,
  MeetingSettings,
  MeetingState,
  OperationResolver,
  ReactSurface,
  Repair,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Meeting, MeetingCapabilities, MeetingOperation } from './types';

const StateReady = AppActivationEvents.createStateEvent(meta.id);
const SettingsReady = AppActivationEvents.createSettingsEvent(MeetingCapabilities.Settings.identifier);

export const MeetingPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Meeting.Meeting),
      metadata: {
        label: (object: Meeting.Meeting) => object.name || new Date(object.created).toLocaleString(),
        icon: 'ph--note--regular',
        iconHue: 'rose',
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Meeting.Meeting], id: 'schemas' }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activatesAfter: [SettingsReady],
    activate: MeetingSettings,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: ActivationEvent.oneOf(AppActivationEvents.SetupSettings, AppActivationEvents.SetupAppGraph),
    activatesAfter: [StateReady],
    activate: MeetingState,
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(MeetingOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.SpacesReady,
    activate: Repair,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(SettingsReady, StateReady),
    activate: CallExtension,
  }),
  Plugin.make,
);
