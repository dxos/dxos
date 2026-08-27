//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { AiContext } from '@dxos/assistant';
import { AgentWizardSkill, AlarmSkill, Chat, ChatContextSkill } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Ref } from '@dxos/echo';
import * as DatabaseSkill from '@dxos/plugin-space/DatabaseSkill';

import { AssistantSkill } from '#skills';
import { AssistantOperation } from '#types';

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

      // Dynamic import to avoid circular dependency with the barrel that also exports SkillManagerHandlers.
      const { SkillManagerSkill } = yield* Effect.promise(() => import('@dxos/assistant-toolkit'));

      const runtime = yield* Effect.context<Database.Service>();
      const binder = new AiContext.Binder({ feed, runtime, registry });

      // Bind default skills via registry refs — no DB clone needed since the ECHO ref
      // resolver already spans the hypergraph registry.
      yield* Effect.promise(() =>
        binder.use((b: AiContext.Binder) =>
          b.bind({
            skills: [
              AssistantSkill,
              DatabaseSkill,
              ChatContextSkill,
              AgentWizardSkill,
              SkillManagerSkill,
              AlarmSkill,
            ].map(({ key }) => Ref.fromURI(Skill.registryURI(key))),
            objects: [Ref.make(chat)],
          }),
        ),
      );

      return { object: chat };
    }),
  ),
);

export default handler;
