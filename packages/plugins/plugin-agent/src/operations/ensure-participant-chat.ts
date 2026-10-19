//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Person } from '@dxos/types';

import { AgentOperation, ChatParticipant, Mode } from '#types';

import { loadAgentBindings } from './ensure-channel-chat.ts';
import { AgentOperationError } from './errors.ts';
import { BASE_SKILL_KEYS, skillRef } from './modes.ts';

/** Loaded on demand: the context runtime is heavy and only needed when a chat is first created. */
const aiContextRuntime = () => import('@dxos/assistant/AiContext');

/**
 * The agent's Composer chat with the person, created on first use. Given an owner, the chat is private to
 * that identity (an existing chat that has no owner yet becomes theirs).
 */
export type ParticipantChatOptions = {
  /** The DID of the identity the chat is private to. */
  owner?: string;
  /** Whether a chat created here runs on EDGE; unset, it runs where the agent's own chat does. */
  remote?: boolean;
};

export const ensureParticipantChat = Effect.fnUntraced(function* (
  agent: Agent.Agent,
  person: Person.Person,
  { owner, remote }: ParticipantChatOptions = {},
) {
  const key = { source: ChatParticipant.PARTICIPANT_SOURCE, id: person.id };
  const existing = yield* Database.query(Query.select(Filter.foreignKeys(Chat.Chat, [key]))).run;
  const candidates = existing.filter((chat) => Obj.getParent(chat)?.id === agent.id);
  // A private chat is never a shared one adopted: with an owner, only that owner's chat matches. Without one
  // (a relay addressing the person), the shared chat is preferred, then the person's private one.
  const match = owner
    ? candidates.find((chat) => ChatParticipant.getOwner(chat) === owner)
    : (candidates.find((chat) => ChatParticipant.getOwner(chat) === undefined) ?? candidates[0]);
  if (match) {
    // `AgentService.getSession` sees the location change and moves the conversation to a fresh EDGE
    // process, which replays the feed, so flipping the flag is the migration.
    if (remote && !match.remote) {
      Obj.update(match, (match) => {
        match.remote = true;
      });
    }
    return match;
  }

  // Read before the new chat exists: the primary chat's objects carry the agent's working context.
  const bindings = yield* loadAgentBindings(agent);
  const skills = yield* Effect.forEach(BASE_SKILL_KEYS, (key) => skillRef(agent, key));

  const primary = yield* Agent.loadChat(agent);
  const location = remote ?? primary?.remote;
  const feed = yield* Database.add(Feed.make());
  const draft = Chat.make({
    [Obj.Meta]: { keys: [key] },
    [Obj.Parent]: agent,
    name: person.preferredName ?? person.fullName,
    feed: Ref.make(feed),
    instructions: agent.instructions,
    ...(location !== undefined ? { remote: location } : {}),
  });
  // Runs on the same model as the agent's own conversation.
  Chat.seedSession(draft, primary?.session);
  // Annotated before it is added: queries re-emit on membership only, so a reader would never see later annotations.
  Obj.update(draft, (draft) => {
    ChatParticipant.set(draft, person);
    if (owner) {
      ChatParticipant.setOwner(draft, owner);
    }
    Mode.setCurrent(draft, Mode.DEFAULT);
  });
  const chat = yield* Database.add(draft);

  const runtime = yield* Effect.context<Database.Service>();
  const AiContext = yield* Effect.promise(aiContextRuntime);
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  // The agent itself is in context, so the model can name it when a tool asks for "the agent you run as".
  const agentBound = bindings.objects.some((ref) => ref.uri === Obj.getURI(agent));
  const objects = [...bindings.objects, ...(agentBound ? [] : [Ref.make<Obj.Unknown>(agent)]), Ref.make(chat)];
  yield* Effect.promise(() => binder.bind({ skills, objects }));
  return chat;
}, Effect.scoped);

const handler: Operation.WithHandler<typeof AgentOperation.EnsureParticipantChat> =
  AgentOperation.EnsureParticipantChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ agent: agentRef, person: personRef, owner, remote }) {
        const agent = yield* Database.load(agentRef);
        const person = yield* Database.load(personRef);
        if (!Obj.instanceOf(Person.Person, person)) {
          return yield* Effect.fail(new AgentOperationError({ message: 'A chat participant must be a person.' }));
        }
        return { chat: Ref.make(yield* ensureParticipantChat(agent, person, { owner, remote })) };
      }),
    ),
  );

export default handler;
