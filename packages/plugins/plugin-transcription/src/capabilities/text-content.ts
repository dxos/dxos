//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Feed, Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { renderByline } from '@dxos/react-ui-transcription';
import { Message, Transcript } from '@dxos/types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(AppCapabilities.TextContent, {
      id: Type.getTypename(Transcript.Transcript),
      getTextContent: async (transcript: Transcript.Transcript) => {
        const space = getSpace(transcript);
        const members = space?.members.get().map((member) => member.identity) ?? [];
        const feed = await transcript.feed.load();
        const feedDXN = feed ? Feed.getQueueUri(feed) : undefined;
        if (!space || !feedDXN) {
          return undefined;
        }
        const messages = await space.db
          .query(Query.select(Filter.type(Message.Message)).from(Scope.feed(feedDXN)))
          .run();
        return messages
          .filter((message) => Obj.instanceOf(Message.Message, message))
          .flatMap((message, index) => renderByline(members)(message, index))
          .join('\n\n');
      },
    });
  }),
);
