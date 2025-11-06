//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { getSpace } from '@dxos/react-client/echo';
import { Message } from '@dxos/types';

import { BlueprintDefinition, IntentResolver, ReactSurface, Transcriber } from './capabilities';
import { renderByline } from './components';
import { meta } from './meta';
import { translations } from './translations';
import { Transcript } from './types';

export const TranscriptionPlugin = definePlugin(meta, () => [
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
        id: Transcript.Transcript.typename,
        metadata: {
          icon: 'ph--subtitles--regular',
          iconHue: 'sky',
          // TODO(wittjosiah): Factor out. Artifact? Separate capability?
          getTextContent: async (transcript: Transcript.Transcript) => {
            const space = getSpace(transcript);
            const members = space?.members.get().map((member) => member.identity) ?? [];
            const queue = space?.queues.get<Message.Message>(transcript.queue.dxn);
            await queue?.refresh();
            const content = queue?.objects
              .filter((message) => Obj.instanceOf(Message.Message, message))
              .flatMap((message, index) => renderByline(members)(message, index))
              .join('\n\n');
            return content;
          },
        },
      }),
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => [contributes(ClientCapabilities.Schema, [Transcript.Transcript])],
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
  defineModule({
    id: `${meta.id}/module/blueprint`,
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
]);
