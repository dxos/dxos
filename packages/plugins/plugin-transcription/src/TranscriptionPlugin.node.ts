//
// Copyright 2023 DXOS.org
//

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Feed, Obj } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { Message, Transcript } from '@dxos/types';

import { BlueprintDefinition, OperationHandler } from '#capabilities';
import { meta } from '#meta';

import { renderByline } from './util';

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
          const feed = await transcript.feed.load();
          const queueDxn = Feed.getQueueDxn(feed);
          const queue = queueDxn ? space?.queues.get<Message.Message>(queueDxn) : undefined;
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
  Plugin.make,
);

export default TranscriptionPlugin;
