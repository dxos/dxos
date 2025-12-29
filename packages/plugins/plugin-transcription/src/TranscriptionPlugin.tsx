//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { getSpace } from '@dxos/react-client/echo';
import { Message, Transcript } from '@dxos/types';

import { BlueprintDefinition, IntentResolver, ReactSurface, Transcriber } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { renderByline } from './util';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
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
    },
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => [Capability.contributes(ClientCapabilities.Schema, [Transcript.Transcript])],
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.addModule({
    id: 'transcription',
    activatesOn: Common.ActivationEvent.SetupAppGraph,
    activate: Transcriber,
  }),
  Plugin.addModule({
    id: 'blueprint',
    activatesOn: Common.ActivationEvent.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.make,
);
