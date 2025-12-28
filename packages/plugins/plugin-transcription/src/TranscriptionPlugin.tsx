//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Plugin, Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { getSpace } from '@dxos/react-client/echo';
import { Message, Transcript } from '@dxos/types';

import { BlueprintDefinition, IntentResolver, ReactSurface, Transcriber } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { renderByline } from './util';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Events.SetupMetadata,
    activate: () =>
      Capability.contributes(Capabilities.Metadata, {
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
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => [Capability.contributes(ClientCapabilities.Schema, [Transcript.Transcript])],
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.addModule({
    id: 'transcription',
    activatesOn: Events.SetupAppGraph,
    activate: Transcriber,
  }),
  Plugin.addModule({
    id: 'blueprint',
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.make,
);
