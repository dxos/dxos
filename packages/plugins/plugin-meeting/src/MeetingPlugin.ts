//
// Copyright 2023 DXOS.org
//

import {
  Capabilities,
  Events,
  allOf,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
  oneOf,
} from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import {
  AppGraphBuilder,
  CallExtension,
  IntentResolver,
  MeetingSettings,
  MeetingState,
  ReactSurface,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Meeting, MeetingAction } from './types';

export const MeetingPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/settings`,
    activatesOn: Events.SetupSettings,
    activate: MeetingSettings,
  }),
  defineModule({
    id: `${meta.id}/module/state`,
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: oneOf(Events.SetupSettings, Events.SetupAppGraph),
    activate: MeetingState,
  }),
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () => [
      contributes(Capabilities.Metadata, {
        id: Meeting.Meeting.typename,
        metadata: {
          label: (object: Meeting.Meeting) => object.name || new Date(object.created).toLocaleString(),
          icon: 'ph--note--regular',
          iconHue: 'rose',
        },
      }),
    ],
  }),
  defineModule({
    id: `${meta.id}/module/schemas`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [Meeting.Meeting]),
  }),
  defineModule({
    id: `${meta.id}/module/on-space-created`,
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      contributes(SpaceCapabilities.onCreateSpace, ({ rootCollection, space }) =>
        createIntent(MeetingAction.onCreateSpace, { rootCollection, space }),
      ),
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  defineModule({
    id: `${meta.id}/module/call-extension`,
    activatesOn: allOf(Events.SettingsReady, ClientEvents.ClientReady),
    activate: CallExtension,
  }),
]);
