//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AiContext } from '@dxos/assistant';
import { Chat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Ref, Type } from '@dxos/echo';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';

import { ProjectOperation } from '#types';

// TODO(wittjosiah): What motivates this being distinct from companion chats?
const handler: Operation.WithHandler<typeof ProjectOperation.CreateChat> = ProjectOperation.CreateChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project }) {
      const { db } = yield* Database.Service;

      // The instructions travel by reference, so the chat follows later edits to the project's.
      const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, {
        db,
        instructions: project.instructions,
      });

      // Ref on the project (annotation) + parent edge; no `SpaceOperation.AddObject`, which would
      // also file the chat in the space root collection and surface it under Collections.
      Chat.linkCompanion({ chat, subject: project });

      // Skills and context objects reach the session through bindings, not the system prompt.
      // Always bound, on top of whatever the project's instructions add: the project itself (the
      // project skill takes it as a tool argument, and the model can only name what is in context)
      // and the type's annotated skills — `Project`'s `SkillsAnnotation` states why each key is there.
      // Bound by registry URI rather than a DB clone, as the assistant's default skills are.
      const annotatedSkills = Option.getOrElse(() => [] as string[])(
        Skill.SkillsAnnotation.get(Type.getSchema(Project.Project)),
      );
      const { skills, objects } = Project.contextBindings(project);
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const feed = yield* Database.load(chat.feed);
      const runtime = yield* Effect.context<Database.Service>();
      const binder = new AiContext.Binder({ feed, runtime, registry });
      yield* Effect.promise(() =>
        binder.use((binder: AiContext.Binder) =>
          binder.bind({
            skills: [...annotatedSkills.map((key) => Ref.fromURI(Skill.registryURI(key))), ...skills],
            objects: [Ref.make(project), ...objects],
          }),
        ),
      );

      yield* Database.flush();

      // Open the chat at its own node — a child of the project — not the Chats-section path
      // `getChatPath` builds: plugin-assistant's section query now excludes project-parented chats, so
      // no node exists there and the plank comes up blank.
      const chatPath = GraphPath.getSpacePath(
        db.spaceId,
        GraphPath.GroupSegments.ai,
        Type.getTypename(Project.Project),
        project.id,
        chat.id,
      );
      yield* Operation.invoke(LayoutOperation.Open, { subject: [chatPath] });
      return { chat };
    }),
  ),
);

export default handler;
