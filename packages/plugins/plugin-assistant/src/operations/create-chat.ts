//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { AiContext } from '@dxos/assistant';
import { AgentWizardSkill, AlarmSkill, Chat, ChatContextSkill } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import * as RegistryPlugin from '@dxos/plugin-registry/RegistryPlugin';
import * as DatabaseSkill from '@dxos/plugin-space/DatabaseSkill';

import { AssistantSkill, PluginManagerSkill } from '#skills';
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
      Obj.setParent(feed, chat);

      // Dynamic import to avoid circular dependency with the barrel that also exports SkillManagerHandlers.
      const { SkillManagerSkill } = yield* Effect.promise(() => import('@dxos/assistant-toolkit'));

      // Only an extensible host contributes the plugin-manager skill's handlers, so binding it
      // elsewhere would bind a skill whose tools cannot run. Read the manager from the ambient
      // context: a host that binds none (a test, the edge operation service) simply skips it.
      const pluginManager = yield* Effect.serviceOption(Plugin.Service);
      const registryPresent = Option.match(pluginManager, {
        onNone: () => false,
        onSome: (manager) =>
          manager.getPlugins().some((plugin) => plugin.meta.profile.key === RegistryPlugin.meta.profile.key),
      });

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
              ...(registryPresent ? [PluginManagerSkill] : []),
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
