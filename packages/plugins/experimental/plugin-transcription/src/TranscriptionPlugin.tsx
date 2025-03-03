//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, IntentResolver, ReactSurface } from './capabilities';
import { meta, TRANSCRIPTION_PLUGIN } from './meta';
import translations from './translations';
import { TranscriptType, TranscriptionAction } from './types';

export const TranscriptionPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: TranscriptType.typename,
          metadata: {
            // TODO(burdon): Options not used?
            createObject: (props: { name?: string }, options: { space: Space }) =>
              createIntent(TranscriptionAction.Create, { ...props }),
            placeholder: ['transcript title placeholder', { ns: TRANSCRIPTION_PLUGIN }],
            icon: 'ph--subtitles--regular',
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => [contributes(ClientCapabilities.Schema, [TranscriptType])],
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
  ]);
