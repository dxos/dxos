//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { Database, Feed, Filter, Hypergraph, Obj, Query, Relation } from '@dxos/echo';
import { EID, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { HasSubject, Message, Organization, Person } from '@dxos/types';
import { isNonNullable } from '@dxos/util';

import { BrainSkill } from '#skills';
import { AgentPresence, BrainService, ChatParticipant, FactEntry, Goal, Memory, Profile } from '#types';

import { agentAnnotationFeeds, factsOf } from './annotations.ts';

/**
 * The graph that spans the client's spaces, when the host has one. A host serving one space (EDGE) has
 * none, or one that throws on access (`Hypergraph.notAvailable`); there an agent reads only the space it runs in.
 */
export const graphOption: Effect.Effect<Option.Option<Hypergraph.Hypergraph>> = Effect.serviceOption(
  Hypergraph.Service,
).pipe(
  Effect.map(
    Option.flatMap((service) => {
      try {
        return Option.some(service.graph);
      } catch {
        return Option.none();
      }
    }),
  ),
);

/** The presences of an agent in one space. */
export type Presence = { spaceId: SpaceId; agents: Agent.Agent[] };

/**
 * Every presence, in a space other than `here`, of the agents whose brains are given, grouped by space. A
 * query that fails (a space still opening) finds nothing rather than failing the turn that asked.
 */
export const presencesElsewhere = (
  graph: Hypergraph.Hypergraph,
  brains: ReadonlySet<string>,
  here: SpaceId | undefined,
): Effect.Effect<Presence[]> =>
  Effect.tryPromise(() => graph.query(Query.select(Filter.type(Agent.Agent)).from('all-accessible-spaces')).run()).pipe(
    Effect.orElseSucceed((): Agent.Agent[] => []),
    Effect.map((agents) => {
      const bySpace = new Map<SpaceId, Agent.Agent[]>();
      for (const agent of agents) {
        const spaceId = Obj.getDatabase(agent)?.spaceId;
        if (spaceId && spaceId !== here && brains.has(AgentPresence.brainOf(agent))) {
          bySpace.set(spaceId, [...(bySpace.get(spaceId) ?? []), agent]);
        }
      }
      return [...bySpace].map(([spaceId, agents]) => ({ spaceId, agents }));
    }),
  );

/** Runs a space-scoped effect against another space of the graph. */
const inSpace =
  (graph: Hypergraph.Hypergraph, spaceId: SpaceId) =>
  <A, E>(effect: Effect.Effect<A, E, Database.Service>) =>
    effect.pipe(Effect.provide(Hypergraph.withDatabase(spaceId).pipe(Layer.provide(Hypergraph.layer(graph)))));

/** An active memory and the ids of the entities it is about. */
export type SubjectMemory = { memory: Memory.Memory; subjects: string[] };

/**
 * What the agents of one space know: the facts they read, and the space's active memories, live goals and the
 * people and organizations those are about (whose ids are local to the space).
 */
export type Knowledge = {
  spaceId: SpaceId;
  facts: FactEntry.Recorded[];
  memories: SubjectMemory[];
  goals: Goal.Goal[];
  entities: Obj.Unknown[];
};

const entityIdOf = (uri: string): string | undefined => {
  const eid = EID.tryParse(uri);
  return eid && EID.getEntityId(eid);
};

/** The knowledge of the given agents in the space the effect runs against. */
const knowledgeOf = Effect.fnUntraced(function* (agents: readonly Agent.Agent[]) {
  const feeds = (yield* Effect.forEach(agents, agentAnnotationFeeds)).flat();
  const facts = yield* factsOf(feeds);
  const relations = yield* Database.query(Filter.type(HasSubject.HasSubject)).run;
  const memories = (yield* Database.query(Filter.type(Memory.Memory)).run)
    .filter((memory) => memory.status === 'active')
    .map((memory): SubjectMemory => ({
      memory,
      // Read from the URIs, so an endpoint that has not loaded yet does not throw.
      subjects: relations
        .filter((relation) => entityIdOf(Relation.getSourceURI(relation)) === memory.id)
        .map((relation) => entityIdOf(Relation.getTargetURI(relation)))
        .filter(isNonNullable),
    }));
  const goals = (yield* Database.query(Filter.type(Goal.Goal)).run).filter(Profile.isLiveGoal);
  const people = yield* Database.query(Filter.type(Person.Person)).run;
  const organizations = yield* Database.query(Filter.type(Organization.Organization)).run;
  return { facts, memories, goals, entities: [...people, ...organizations] };
});

/**
 * What the given agents know in the other spaces they are in: one {@link Knowledge} per space, read through
 * the graph. Empty where the host has no graph, or the agents are in no other space.
 */
export const knowledgeElsewhere = Effect.fnUntraced(function* (agents: readonly Agent.Agent[]) {
  const graph = Option.getOrUndefined(yield* graphOption);
  const { db } = yield* Database.Service;
  if (!graph || agents.length === 0) {
    return [];
  }

  const presences = yield* presencesElsewhere(graph, new Set(agents.map(AgentPresence.brainOf)), db.spaceId);
  const found = yield* Effect.forEach(presences, ({ spaceId, agents }) =>
    knowledgeOf(agents).pipe(
      Effect.map((knowledge): Knowledge => ({ spaceId, ...knowledge })),
      inSpace(graph, spaceId),
      Effect.orElseSucceed(() => undefined),
    ),
  );
  return found.filter(isNonNullable);
});

/** Upper bounds on a brief, so a long-lived agent's first message in a space stays a short read. */
const BRIEF_FACTS = 30;
const BRIEF_MEMORIES = 20;
const BRIEF_GOALS = 10;
const BRIEF_MESSAGES = 12;
const BRIEF_MESSAGE_CHARS = 400;

type Line = { at: string; text: string };

const clip = (text: string, length: number): string =>
  text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;

/**
 * The latest messages of the agents' chats that the person may see — shared chats and their own private
 * ones, never another member's — as `speaker: text` lines, the agent speaking as "You".
 */
const conversationOf = Effect.fnUntraced(function* (agents: readonly Agent.Agent[], owner: string | undefined) {
  const lines: Line[] = [];
  // An EDGE-hosted chat holds each prompt twice — the queued entry and the turn's own copy — so a message is
  // said once per chat, as is one replicated twice.
  const seen = new Set<string>();
  for (const agent of agents) {
    // `Filter.and` widens the child-of result, so the chats are narrowed back.
    const chats = (yield* Database.query(Filter.and(Filter.type(Chat.Chat), Filter.childOf(agent))).run)
      .filter(Obj.instanceOf(Chat.Chat))
      .filter((chat) => ChatParticipant.isVisibleTo(chat, owner));
    for (const chat of chats) {
      const feed = Option.getOrUndefined(yield* Database.load(chat.feed).pipe(Effect.option));
      if (!feed) {
        continue;
      }
      const participantId = ChatParticipant.get(chat);
      const [participant] = participantId ? yield* Database.query(Filter.id(participantId)).run : [];
      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      for (const message of messages) {
        // Synthetic text (a relay, a brief like this one) is not something anyone said.
        const text = message.blocks
          .flatMap((block) => (block._tag === 'text' && block.disposition !== 'synthetic' ? [block.text] : []))
          .join('\n')
          .trim();
        if (text.length === 0 || (message.sender.role !== 'user' && message.sender.role !== 'assistant')) {
          continue;
        }
        const said = `${chat.id}:${message.sender.role}:${text}`;
        if (seen.has(message.id) || seen.has(said)) {
          continue;
        }
        seen.add(message.id);
        seen.add(said);
        const speaker =
          message.sender.role === 'assistant'
            ? 'You'
            : (message.sender.name ?? (participant ? Profile.displayName(participant) : 'They'));
        lines.push({ at: message.created, text: `${speaker}: ${clip(text, BRIEF_MESSAGE_CHARS)}` });
      }
    }
  }
  return lines;
});

export type BriefOptions = {
  /** The DID of the person the chat is with, whose private conversations elsewhere the brief may quote. */
  owner?: string;
};

/**
 * What the agent knows from the other spaces it is in, as the note a new conversation starts with: the facts
 * it read, the memories and goals there, and the person's latest conversation with it. `undefined` when the
 * agent is in no other space, or knows nothing there.
 */
export const composeBrief = Effect.fnUntraced(function* (agent: Agent.Agent, { owner }: BriefOptions = {}) {
  const graph = Option.getOrUndefined(yield* graphOption);
  if (!graph) {
    return undefined;
  }

  const presences = yield* presencesElsewhere(
    graph,
    new Set([AgentPresence.brainOf(agent)]),
    Obj.getDatabase(agent)?.spaceId,
  );
  const read = yield* Effect.forEach(presences, ({ spaceId, agents }) =>
    Effect.all([knowledgeOf(agents), conversationOf(agents, owner)]).pipe(
      inSpace(graph, spaceId),
      Effect.orElseSucceed(() => undefined),
    ),
  );
  const found = read.filter(isNonNullable);

  // A fact read on EDGE names its speaker by DID; the person holding it gives the name.
  const names = new Map(
    found.flatMap(([{ entities }]) =>
      entities
        .filter(Obj.instanceOf(Person.Person))
        .flatMap((person) =>
          (person.identities ?? [])
            .filter((identity) => identity.label === ChatParticipant.IDENTITY_LABEL)
            .map((identity): [string, string] => [identity.value.toLowerCase(), Profile.displayName(person)]),
        ),
    ),
  );
  const speakerOf = (speaker: string | undefined): string | undefined =>
    speaker === undefined
      ? undefined
      : (names.get(speaker.toLowerCase()) ?? (speaker.startsWith('did:') ? undefined : speaker));

  const facts = found
    .flatMap(([{ facts }]) => facts)
    .sort((left, right) => right.fact.attribution.generatedAtTime.localeCompare(left.fact.attribution.generatedAtTime))
    .slice(0, BRIEF_FACTS)
    .map(({ fact }) => {
      const speaker = speakerOf(fact.attribution.agent);
      const said = speaker ? `, said by ${speaker}` : '';
      return `- ${FactEntry.factText(fact)} (${fact.attribution.generatedAtTime.slice(0, 10)}${said})`;
    });
  const memories = found
    .flatMap(([{ memories }]) => memories.map(({ memory }) => memory))
    .sort(Profile.byNewest)
    .slice(0, BRIEF_MEMORIES)
    .map((memory) => `- ${memory.content}`);
  const goals = found
    .flatMap(([{ goals }]) => goals)
    .slice(0, BRIEF_GOALS)
    .map((goal) => `- ${goal.title} (${goal.status})`);
  const conversation = found
    .flatMap(([, lines]) => lines)
    .sort((left, right) => left.at.localeCompare(right.at))
    .slice(-BRIEF_MESSAGES)
    .map(({ text }) => text);

  const sections = [
    ['What you learned there:', facts],
    ['What you recorded:', memories],
    ['Goals you are tracking:', goals],
    ['Your latest conversation there:', conversation],
  ] as const;
  const body = sections
    .filter(([, lines]) => lines.length > 0)
    .map(([heading, lines]) => [heading, ...lines].join('\n'));
  if (body.length === 0) {
    return undefined;
  }

  return [
    `${BrainSkill.MEMORY_HEADER} You are in other spaces too, and this is what you remember from them. It is your ` +
      'own memory, not something the person said: use it when it helps, and do not quote or mention this note.',
    ...body,
  ].join('\n\n');
});

/**
 * Starts a new chat of the agent with what it knows from its other spaces, as a synthetic note in the chat's
 * feed, so whichever runtime runs the chat — this client, or EDGE, which reads one space — begins with it.
 * Returns whether a note was written.
 */
export const seedBrief = (agent: Agent.Agent, feed: Feed.Feed, options?: BriefOptions) =>
  Effect.gen(function* () {
    const brief = yield* composeBrief(agent, options);
    if (!brief) {
      return false;
    }

    yield* Feed.append(feed, [Message.make({ sender: { role: 'user' }, blocks: BrainService.wakeBlocks(brief) })]);
    return true;
  }).pipe(
    // The note is an aid: a space that cannot be read must not keep the conversation from opening.
    Effect.catchCause((cause) =>
      Effect.sync(() => {
        log.warn('memory note not written', { agent: agent.id, cause });
        return false;
      }),
    ),
  );
