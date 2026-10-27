//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Message, Person } from '@dxos/types';

import { AgentOperation, ChatParticipant, Mode } from '#types';

import { loadAgentObjects } from './ensure-channel-chat.ts';
import { AgentOperationError } from './errors.ts';
import { sessionSkills } from './modes.ts';

/** Loaded on demand: the context runtime is heavy and only needed when a chat is first created. */
const aiContextRuntime = () => import('@dxos/assistant/AiContext');

/** How long choosing between a person's chats waits for their messages to arrive from EDGE. */
const FEED_SYNC_TIMEOUT = '5 seconds';

/**
 * Of several chats that each match, the one with the newest message: two opens at once each make a chat, and the
 * person's conversation is in the one they last talked in.
 */
const latestOf = Effect.fnUntraced(function* (chats: readonly Chat.Chat[]) {
  if (chats.length < 2) {
    return chats[0];
  }

  const dated = yield* Effect.forEach(
    chats,
    (chat) =>
      Effect.gen(function* () {
        const feed = yield* Database.load(chat.feed);
        // A chat hosted on EDGE may not have its messages on this device yet, and would read as empty.
        yield* Feed.sync(feed, { shouldPush: false }).pipe(Effect.timeoutOption(FEED_SYNC_TIMEOUT), Effect.exit);
        const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        // Compared as instants: an ISO timestamp may carry any offset.
        const last = messages.reduce((newest, message) => Math.max(newest, Date.parse(message.created) || 0), 0);
        return { chat, last };
      }).pipe(Effect.orElseSucceed(() => ({ chat, last: 0 }))),
    { concurrency: 4 },
  );
  return dated.reduce((latest, entry) => (entry.last > latest.last ? entry : latest)).chat;
});

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
  { owner: givenOwner, remote }: ParticipantChatOptions = {},
) {
  // An empty owner is no owner, for the lookup as for a chat created here.
  const owner = givenOwner || undefined;
  const key = { source: ChatParticipant.PARTICIPANT_SOURCE, id: person.id };
  const existing = yield* Database.query(Query.select(Filter.foreignKeys(Chat.Chat, [key]))).run;
  const candidates = existing.filter((chat) => Obj.getParent(chat)?.id === agent.id);
  // A private chat is never a shared one adopted: with an owner, only that owner's chats match. Without one
  // (a relay addressing the person), the shared chat is preferred, then the person's private one.
  const preferred = candidates.filter((chat) => ChatParticipant.getOwner(chat) === owner);
  const match = (yield* latestOf(preferred)) ?? (owner === undefined ? yield* latestOf(candidates) : undefined);
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
  const agentObjects = yield* loadAgentObjects(agent);
  const skills = yield* sessionSkills(agent);

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
  const agentBound = agentObjects.some((ref) => ref.uri === Obj.getURI(agent));
  const objects = [...agentObjects, ...(agentBound ? [] : [Ref.make<Obj.Unknown>(agent)]), Ref.make(chat)];
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
