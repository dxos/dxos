//
// Copyright 2023 DXOS.org
//

import {
  Capabilities,
  Events,
  ActivationEvent,
  Capability,
  Plugin,
  createIntent,
} from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import {
  AppGraphBuilder,
  CallExtension,
  IntentResolver,
  MeetingSettings,
  MeetingState,
  ReactSurface,
  Repair,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Meeting, MeetingAction } from './types';

export const MeetingPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Events.SetupSettings,
    activate: MeetingSettings,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: ActivationEvent.oneOf(Events.SetupSettings, Events.SetupAppGraph),
    activate: MeetingState,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Events.SetupMetadata,
    activate: () => [
      Capability.contributes(Capabilities.Metadata, {
        id: Type.getTypename(Meeting.Meeting),
        metadata: {
          label: (object: Meeting.Meeting) => object.name || new Date(object.created).toLocaleString(),
          icon: 'ph--note--regular',
          iconHue: 'rose',
        },
      }),
    ],
  }),
  Plugin.addModule({
    id: 'schemas',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Meeting.Meeting]),
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) => createIntent(MeetingAction.OnCreateSpace, params)),
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.SpacesReady,
    activate: Repair,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(Events.SettingsReady, ClientEvents.ClientReady),
    activate: CallExtension,
  }),
  Plugin.make,
);
