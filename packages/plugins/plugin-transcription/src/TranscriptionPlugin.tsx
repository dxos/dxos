//
// Copyright 2023 DXOS.org
//

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Obj } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { Message, Transcript } from '@dxos/types';

import { meta } from './meta';
import { translations } from './translations';
import { renderByline } from './util';

import { BlueprintDefinition, OperationHandler, ReactSurface, Transcriber } from '#capabilities';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Transcript.Transcript.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Transcript.Transcript).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Transcript.Transcript).pipe(Option.getOrThrow).hue ?? 'white',
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
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
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
