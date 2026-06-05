//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Feed, Obj, Type } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { Message, Transcript } from '@dxos/types';

import { renderByline } from '../util';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(AppCapabilities.TextContent, {
      id: Type.getTypename(Transcript.Transcript),
      getTextContent: async (transcript: Transcript.Transcript) => {
        const space = getSpace(transcript);
        const members = space?.members.get().map((member) => member.identity) ?? [];
        const feed = await transcript.feed.load();
        const feedDXN = Feed.getQueueUri(feed);
        const queue = feedDXN ? space?.queues.get<Message.Message>(feedDXN) : undefined;
        await queue?.refresh();
        return queue?.objects
          .filter((message) => Obj.instanceOf(Message.Message, message))
          .flatMap((message, index) => renderByline(members)(message, index))
          .join('\n\n');
      },
    });
  }),
);
