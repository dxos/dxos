//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { QueueImpl } from '@dxos/echo-db';
import { isInstanceOf } from '@dxos/echo-schema';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { getSpace } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { IntentResolver, ReactSurface, Transcriber } from './capabilities';
import { renderMarkdown } from './components';
import { meta } from './meta';
import translations from './translations';
import { TranscriptType } from './types';

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
      activate: (context) =>
        contributes(Capabilities.Metadata, {
          id: TranscriptType.typename,
          metadata: {
            icon: 'ph--subtitles--regular',
            // TODO(wittjosiah): Factor out. Artifact? Separate capability?
            getTextContent: async (transcript: TranscriptType) => {
              const client = context.getCapability(ClientCapabilities.Client);
              const space = getSpace(transcript);
              const members = space?.members.get().map((member) => member.identity) ?? [];
              const queue = new QueueImpl(client.edge, transcript.queue.dxn);
              await queue.refresh();
              const content = queue.items
                .filter((message) => isInstanceOf(DataType.Message, message))
                .flatMap((message, index) => renderMarkdown(members)(message, index))
                .join('\n\n');
              return content;
            },
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
      activatesOn: Events.SetupReactSurface,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/transcription`,
      activatesOn: Events.SetupAppGraph,
      activate: Transcriber,
    }),
  ]);
