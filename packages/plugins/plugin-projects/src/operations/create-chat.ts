//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AiContext } from '@dxos/assistant';
import { ProjectSkill } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Obj, Ref, Type } from '@dxos/echo';
import { AssistantOperation } from '@dxos/plugin-assistant';

import { ProjectOperation } from '#types';

import { ARTIFACT_SKILL_KEYS } from '../skills/keys';

const handler: Operation.WithHandler<typeof ProjectOperation.CreateChat> = ProjectOperation.CreateChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project }) {
      const { db } = yield* Database.Service;

      // The instructions travel by reference, so the chat follows later edits to the project's.
      const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, {
        db,
        instructions: project.instructions,
      });

      // The parent edge is the ownership statement; no `SpaceOperation.AddObject`, which would also
      // file the chat in the space root collection and surface it under Collections.
      Obj.setParent(chat, project);

      // Skills and context objects reach the session through bindings, not the system prompt.
      // Always bound, on top of whatever the project's instructions add:
      //  - the project itself, because `ProjectSkill` takes the project as a tool argument and the
      //    model can only name it if it is in context;
      //  - `ProjectSkill`, so a created object can be filed into the project's artifacts. Filing is a
      //    tool call the model makes deliberately (see DESIGN.md), so without this the chat creates
      //    documents that belong to no project;
      //  - the artifact-type skills, so producing the artifact the user asked for does not cost a
      //    `query-skills`/`enable-skills` round trip first (a companion chat gets these from its
      //    subject's `SkillsAnnotation`; a project chat has no single subject to read them from).
      // Bound by registry URI rather than a DB clone, as the assistant's default skills are.
      const { skills, objects } = Project.contextBindings(project);
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const feed = yield* Database.load(chat.feed);
      const runtime = yield* Effect.runtime<Database.Service>();
      const binder = new AiContext.Binder({ feed, runtime, registry });
      yield* Effect.promise(() =>
        binder.use((binder: AiContext.Binder) =>
          binder.bind({
            skills: [
              ...[ProjectSkill.key, ...ARTIFACT_SKILL_KEYS].map((key) => Ref.fromURI(Skill.registryURI(key))),
              ...skills,
            ],
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
