//
// Copyright 2023 DXOS.org
//

import * as Option from 'effect/Option';

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Type } from '@dxos/echo';

import { meta } from '#meta';
import { translations } from './translations';
import { Meeting, MeetingCapabilities } from '#types';

import {
  AppGraphBuilder,
  CallExtension,
  MeetingSettings,
  MeetingState,
  OperationHandler,
  ReactSurface,
} from '#capabilities';

const StateReady = AppActivationEvents.createStateEvent(meta.id);
const SettingsReady = AppActivationEvents.createSettingsEvent(MeetingCapabilities.Settings.identifier);

export const MeetingPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Meeting.Meeting),
      metadata: {
        label: (object: Meeting.Meeting) => object.name || new Date(object.created).toLocaleString(),
        icon: Annotation.IconAnnotation.get(Meeting.Meeting).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Meeting.Meeting).pipe(Option.getOrThrow).hue ?? 'white',
      },
    },
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
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
    activatesOn: ActivationEvent.allOf(SettingsReady, StateReady),
    activate: CallExtension,
  }),
  Plugin.make,
);
