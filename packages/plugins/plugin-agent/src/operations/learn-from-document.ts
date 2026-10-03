//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { LearnSkill } from '#skills';
import { AgentOperation, Goal, Memory } from '#types';

import { AgentOperationError } from './errors.ts';
import { skillRef } from './modes.ts';

/** Loaded on demand: the context runtime is heavy and only needed when the learning chat is first created. */
const aiContextRuntime = () => import('@dxos/assistant/AiContext');

/** `Obj.Meta` key source of the chat an agent learns a document in (id = the document's entity id). */
export const LEARN_SOURCE = 'org.dxos.agent/learn';

/** The markdown of a document or text object. */
const readDocument = Effect.fnUntraced(function* (document: Obj.Unknown) {
  if (Obj.instanceOf(Markdown.Document, document)) {
    const text = yield* Database.load(document.content);
    return { name: document.name ?? 'Document', content: text.content };
  }
  if (Obj.instanceOf(Text.Text, document)) {
    return { name: 'Text', content: document.content };
  }
  return yield* Effect.fail(new AgentOperationError({ message: 'The document must be a markdown document or text.' }));
});

/**
 * The agent's chat for learning one document, keyed by it so re-learning reuses the conversation and
 * it is never taken for the agent's primary chat.
 */
const ensureLearningChat = Effect.fnUntraced(function* (agent: Agent.Agent, document: Obj.Unknown) {
  const key = { source: LEARN_SOURCE, id: document.id };
  const existing = yield* Database.query(Query.select(Filter.foreignKeys(Chat.Chat, [key]))).run;
  const match = existing.find((chat) => Obj.getParent(chat)?.id === agent.id);
  if (match) {
    return match;
  }

  const primary = yield* Agent.loadChat(agent);
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(
    Chat.make({
      [Obj.Meta]: { keys: [key] },
      [Obj.Parent]: agent,
      name: 'Learning',
      feed: Ref.make(feed),
      instructions: agent.instructions,
    }),
  );
  Chat.seedSession(chat, primary?.session);

  const runtime = yield* Effect.context<Database.Service>();
  const AiContext = yield* Effect.promise(aiContextRuntime);
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  const skill = yield* skillRef(agent, LearnSkill.key);
  yield* Effect.promise(() =>
    binder.bind({
      skills: [skill],
      objects: [Ref.make<Obj.Unknown>(agent), Ref.make(document), Ref.make(chat)],
    }),
  );
  return chat;
}, Effect.scoped);

const count = Effect.gen(function* () {
  const memories = yield* Database.query(Filter.type(Memory.Memory)).run;
  const goals = yield* Database.query(Filter.type(Goal.Goal)).run;
  return { memories: memories.length, goals: goals.length };
});

const handler: Operation.WithHandler<typeof AgentOperation.LearnFromDocument> = AgentOperation.LearnFromDocument.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, document: documentRef }) {
      const agent = yield* Database.load(agentRef);
      const document = yield* Database.load(documentRef);
      const { name, content } = yield* readDocument(document);
      const chat = yield* ensureLearningChat(agent, document);
      yield* Database.flush();

      const before = yield* count;
      // A model turn rather than a parser: what counts as a goal, a rule or a follow-up is judgement.
      const session = yield* AgentService.getSession(chat);
      yield* session.submitPrompt([
        {
          _tag: 'text',
          disposition: 'synthetic',
          text: trim`
            ${LearnSkill.PROMPT_MARKER}
            <document name="${name}" ref="${Obj.getURI(document)}">
            ${content}
            </document>
          `,
        },
      ]);
      yield* session.waitForCompletion();
      yield* Database.flush();
      const after = yield* count;

      return {
        chat: Ref.make(chat),
        memories: after.memories - before.memories,
        goals: after.goals - before.goals,
      };
    }),
  ),
);

export default handler;
