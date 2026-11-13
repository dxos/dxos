//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as BrainSkill from '@dxos/plugin-brain/BrainSkill';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { resolveStorySpace } from '@dxos/storybook-testing';

/** Marks the chat this plugin creates, so a reload reopens it rather than adding another. */
const BRAIN_CHAT_KEY = { source: 'org.dxos.plugin.stories.brain', id: 'chat' };

/**
 * Creates the story's chat once the space is available — through the assistant's `CreateChat`, which binds its default
 * skills — and binds the Brain skill, so the agent queries the fact store from its first prompt.
 */
export const BrainChatPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.stories.brain.chat'), name: 'Brain chat' }),
).pipe(
  Plugin.addModule({
    id: 'org.dxos.plugin.stories.brain.chat.setup',
    // The space is not available until the client observes it.
    activatesOn: ClientEvents.SpacesAvailable,
    requires: [Capabilities.OperationInvoker, ClientCapabilities.Client, Capabilities.AtomRegistry],
    activate: Effect.fnUntraced(function* () {
      const { invoke } = yield* Capabilities.OperationInvoker;
      const client = yield* ClientCapabilities.Client;
      const registry = yield* Capabilities.AtomRegistry;
      const space = yield* resolveStorySpace(client);
      yield* invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(space.id) });

      const [existing] = yield* Effect.promise(() =>
        space.db.query(Filter.foreignKeys(Chat.Chat, [BRAIN_CHAT_KEY])).run(),
      );
      if (existing) {
        return [];
      }

      const { object: chat } = yield* invoke(
        AssistantOperation.CreateChat,
        { name: 'Fact explorer' },
        { spaceId: space.db.spaceId },
      );
      Obj.update(chat, (chat) => {
        Obj.getMeta(chat).keys.push(BRAIN_CHAT_KEY);
      });
      space.db.add(chat);

      const skill = space.db.add(BrainSkill.make());
      const feed = yield* Effect.promise(() => chat.feed.load());
      const runtime = yield* Effect.context<Database.Service>().pipe(Effect.provide(Database.layer(space.db)));
      const binder = new AiContext.Binder({ feed, runtime, registry });
      yield* Effect.promise(() => binder.use((binder) => binder.bind({ skills: [Ref.make(skill)] })));
      return [];
    }),
  }),
  Plugin.make,
);
