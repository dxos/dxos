//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Ref } from '@dxos/echo';

import { AssistantOperation } from '#types';

import { bindChatDefaults } from '../util/default-skills.ts';

const handler: Operation.WithHandler<typeof AssistantOperation.CreateChat> = AssistantOperation.CreateChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, instructions }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const { db } = yield* Database.Service;

      // The chat is left for the caller to add (`SpaceOperation.AddObject`); the feed is added here only
      // because the default bindings below are written immediately, and `Feed.query` asserts a stored feed.
      // TODO(wittjosiah): Defer binding until the caller has added the chat, so the feed can stay in
      //  memory too — nothing needs to write to a feed before its chat is in the database.
      const feed = db.add(Feed.make());
      const chat = Chat.make({ name, feed: Ref.make(feed), instructions });

      const contributed = yield* Capability.getAll(AppCapabilities.SkillDefinition);

      const runtime = yield* Effect.context<Database.Service>();
      const binder = new AiContext.Binder({ feed, runtime, registry });
      yield* Effect.promise(() => binder.use((b: AiContext.Binder) => bindChatDefaults(b, { chat, contributed })));

      return { object: chat };
    }),
  ),
);

export default handler;
