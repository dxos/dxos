//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { Message, Transcript } from '@dxos/types';

import { BlueprintDefinition, OperationResolver, ReactSurface, Transcriber } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { renderByline } from './util';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
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
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Transcript.Transcript] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'transcription',
    activatesOn: AppActivationEvents.SetupAppGraph,
    activate: Transcriber,
  }),
  Plugin.make,
);
