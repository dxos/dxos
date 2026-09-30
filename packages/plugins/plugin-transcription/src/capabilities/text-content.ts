//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Feed, Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Message, Transcript } from '@dxos/types';

import { renderByline } from '../util/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.Service;
    return Capability.contribute(AppCapabilities.TextContent, {
      id: Type.getTypename(Transcript.Transcript),
      getTextContent: async (transcript: Transcript.Transcript) => {
        const db = Obj.getDatabase(transcript);
        // Read at call time: the space service arrives with the client, after this module activates.
        const [spaceService] = manager.getAll(ClientCapabilities.SpaceService);
        const members =
          db && spaceService
            ? await EffectEx.runPromise(
                spaceService.members(db.spaceId).pipe(Stream.runHead, Effect.map(Option.getOrElse(() => []))),
              )
            : [];
        const feed = await transcript.feed.load();
        const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;
        if (!db || !feedDXN) {
          return undefined;
        }
        const messages = await db.query(Query.select(Filter.type(Message.Message)).from(Scope.feed(feedDXN))).run();
        return messages
          .filter((message) => Obj.instanceOf(Message.Message, message))
          .flatMap((message, index) => renderByline(members)(message, index))
          .join('\n\n');
      },
    });
  }),
);
