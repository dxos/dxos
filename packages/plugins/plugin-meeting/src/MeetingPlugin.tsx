//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { DeckCapabilities, DeckEvents } from '@dxos/plugin-deck';
import { ThreadEvents, ThreadCapabilities } from '@dxos/plugin-thread';

import { AppGraphBuilder, IntentResolver, ReactContext, ReactSurface } from './capabilities';
import { MEETING_PLUGIN, meta } from './meta';
import translations from './translations';
import { MeetingType } from './types';

export const MeetingPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [MeetingType]),
    }),
    defineModule({
      id: `${meta.id}/module/activity`,
      activatesOn: ThreadEvents.SetupActivity,
      activate: () =>
        contributes(ThreadCapabilities.Activity, {
          id: 'meeting',
          label: ['meeting activity label', { ns: MEETING_PLUGIN }],
          icon: 'ph--video-camera--regular',
        }),
    }),
    defineModule({
      id: `${meta.id}/module/react-context`,
      activatesOn: Events.Startup,
      activate: ReactContext,
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
      id: `${meta.id}/module/complementary-panels`,
      activatesOn: DeckEvents.SetupComplementaryPanels,
      activate: () => [
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'meeting',
          label: ['meeting panel label', { ns: MEETING_PLUGIN }],
          icon: 'ph--phone-call--regular',
          fixed: true,
        }),
      ],
    }),
  ]);
