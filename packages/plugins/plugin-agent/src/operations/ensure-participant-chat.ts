//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Person } from '@dxos/types';

import { AgentOperation, ChatParticipant, Mode } from '#types';

import { loadAgentBindings } from './ensure-thread-chat.ts';
import { AgentOperationError } from './errors.ts';
import { BASE_SKILL_KEYS, skillRef } from './modes.ts';

/** Loaded on demand: the context runtime is heavy and only needed when a chat is first created. */
const aiContextRuntime = () => import('@dxos/assistant/AiContext');

const handler: Operation.WithHandler<typeof AgentOperation.EnsureParticipantChat> =
  AgentOperation.EnsureParticipantChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ agent: agentRef, person: personRef }) {
        const agent = yield* Database.load(agentRef);
        const person = yield* Database.load(personRef);
        if (!Obj.instanceOf(Person.Person, person)) {
          return yield* Effect.fail(new AgentOperationError({ message: 'A chat participant must be a person.' }));
        }

        const key = { source: ChatParticipant.PARTICIPANT_SOURCE, id: person.id };
        const existing = yield* Database.query(Query.select(Filter.foreignKeys(Chat.Chat, [key]))).run;
        const match = existing.find((chat) => Obj.getParent(chat)?.id === agent.id);
        if (match) {
          return { chat: Ref.make(match) };
        }

        // Read before the new chat exists: the primary chat's objects carry the agent's working context.
        const bindings = yield* loadAgentBindings(agent);
        const skills = yield* Effect.forEach(BASE_SKILL_KEYS, (key) => skillRef(agent, key));

        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(
          Chat.make({
            [Obj.Meta]: { keys: [key] },
            [Obj.Parent]: agent,
            name: person.preferredName ?? person.fullName,
            feed: Ref.make(feed),
            instructions: agent.instructions,
          }),
        );
        // Runs on the same model as the agent's own conversation.
        Chat.seedSession(chat, (yield* Agent.loadChat(agent))?.session);
        ChatParticipant.set(chat, person);
        Mode.setCurrent(chat, Mode.DEFAULT);

        const runtime = yield* Effect.context<Database.Service>();
        const AiContext = yield* Effect.promise(aiContextRuntime);
        const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
        yield* Effect.promise(() => binder.bind({ skills, objects: [...bindings.objects, Ref.make(chat)] }));
        return { chat: Ref.make(chat) };
      }, Effect.scoped),
    ),
  );

export default handler;
