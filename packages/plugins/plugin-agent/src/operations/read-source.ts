//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Order from 'effect/Order';

import type { AiService } from '@dxos/ai';
import type * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Error';
import { type RDF, type SemanticIndexError, extractDocFacts, normalizeEntityId } from '@dxos/pipeline-rdf';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';

import { AgentOperation, ChatParticipant, FactEntry, Profile } from '#types';

import { ensureAnnotationFeed } from './annotations.ts';
import { AgentOperationError } from './errors.ts';
import * as Identity from './identity.ts';

const EXTRACTOR: FactEntry.Extractor = { id: 'org.dxos.pipeline-rdf.extract', model: 'default', version: '1' };

/** One utterance of a source, so a fact quoting it can be attributed to its speaker and time. */
type Segment = {
  text: string;
  /** The speaker's display name, shown to the extractor. */
  speaker?: string;
  /** The speaker's entity id (their identity DID when known), which the fact is attributed to. */
  entity?: string;
  /** DXN of the message, when the utterance is one. */
  source?: string;
  at?: string;
};

type SourceText = {
  name: string;
  /** DXN or URL every fact is attributed to unless it quotes a segment. */
  uri: string;
  text: string;
  segments: Segment[];
};

/** A markdown transcript's `**Speaker:** text` paragraphs; other paragraphs carry no speaker. */
const SPEAKER_LINE = /^\*\*([^*:]{1,40}):\*\*\s*/;

const segmentMarkdown = (content: string): Segment[] =>
  content.split(/\n\s*\n/).map((paragraph) => {
    const match = paragraph.trim().match(SPEAKER_LINE);
    return match ? { speaker: match[1].trim(), text: paragraph.trim().slice(match[0].length) } : { text: paragraph };
  });

/** The name the agent's own messages are attributed to in extracted facts. */
export const agentSpeaker = (agent: Agent.Agent): string => agent.name ?? 'Agent';

/** The entity id the agent's own messages are attributed to, so its words can be pushed as quiet. */
export const agentEntity = (agent: Agent.Agent): string => normalizeEntityId(agentSpeaker(agent));

type Speaker = { readonly name: string; readonly entity: string };

/**
 * Who sent a message: a display name for the extractor and an entity id for the facts. The id is the
 * sender's identity DID when it can be found — on the message, as the private chat's owner (Composer's
 * prompts carry neither name nor contact), through the sender's contact or the chat's participant — and
 * otherwise the slug of their name.
 */
const speakerOf = Effect.fnUntraced(function* (
  agent: Agent.Agent,
  message: Message.Message,
  { owner, participant, roster }: { owner?: string; participant?: Obj.Unknown; roster: Identity.Roster },
) {
  if (message.sender.role === 'assistant') {
    return { name: agentSpeaker(agent), entity: agentEntity(agent) } satisfies Speaker;
  }
  const contact = message.sender.contact
    ? yield* Database.load(message.sender.contact).pipe(Effect.orElseSucceed(() => undefined))
    : undefined;
  const person = contact ?? participant;
  const name = message.sender.name ?? (person ? Profile.displayName(person) : 'User');
  const entity =
    message.sender.identityDid ??
    owner ??
    Identity.identityOf(contact) ??
    Identity.identityOf(participant) ??
    Identity.resolveName(roster, name);
  return { name, entity } satisfies Speaker;
});

/** Feed items in append order. */
const inAppendOrder = <T extends Obj.Unknown>(items: readonly T[]): T[] =>
  [...items].sort(Order.mapInput(Order.Number, Feed.getPosition));

/** How many messages before the cursor an incremental read shows the extractor, so references in new messages resolve. */
const CONTEXT_MESSAGES = 8;

const CONTEXT_HEADER = 'Earlier messages, for context only — do not extract facts from them:';
const NEW_HEADER = 'New messages:';

const renderSegment = ({ text, speaker, at }: Segment): string => `[${at}] ${speaker}: ${text}`;

/**
 * The chat's messages after `after` (a message URI) in append order, each as a `[time] speaker: text`
 * line, preceded by up to {@link CONTEXT_MESSAGES} earlier ones as context; `through` is the last
 * message, read or not, so the next read starts after it.
 */
const readChat = Effect.fnUntraced(function* (agent: Agent.Agent, chat: Chat.Chat, after?: string) {
  const feed = yield* Database.load(chat.feed);
  const messages = inAppendOrder(yield* Feed.query(feed, Filter.type(Message.Message)).run);
  const index = after === undefined ? -1 : messages.findIndex((message) => Obj.getURI(message) === after);
  const start = index + 1;
  const participantId = ChatParticipant.get(chat);
  const participant = participantId ? (yield* Database.query(Filter.id(participantId)).run).at(0) : undefined;
  const owner = ChatParticipant.getOwner(chat);
  const roster = yield* Identity.loadRoster;
  const toSegment = Effect.fnUntraced(function* (message: Message.Message) {
    // Synthetic text (a woken chat's relay, system notes) is not something anyone said.
    const text = message.blocks
      .flatMap((block) => (block._tag === 'text' && block.disposition !== 'synthetic' ? [block.text] : []))
      .join('\n')
      .trim();
    if (message.sender.role === 'tool' || text.length === 0) {
      return undefined;
    }
    const speaker = yield* speakerOf(agent, message, { owner, participant, roster });
    return {
      text,
      speaker: speaker.name,
      entity: speaker.entity,
      source: Obj.getURI(message),
      at: message.created,
    } satisfies Segment;
  });

  const segments: Segment[] = [];
  for (const message of messages.slice(start)) {
    const segment = yield* toSegment(message);
    if (segment) {
      segments.push(segment);
    }
  }
  const context: Segment[] = [];
  for (let position = start - 1; position >= 0 && context.length < CONTEXT_MESSAGES; position--) {
    const segment = yield* toSegment(messages[position]);
    if (segment) {
      context.unshift(segment);
    }
  }

  const lines = segments.map(renderSegment).join('\n');
  const contextLines = context.map(renderSegment).join('\n');
  const last = messages.at(-1);
  return {
    name: chat.name ?? 'Conversation',
    text: context.length === 0 ? lines : `${CONTEXT_HEADER}\n${contextLines}\n\n${NEW_HEADER}\n${lines}`,
    transcript: context.length === 0 ? lines : `${contextLines}\n${lines}`,
    segments,
    through: last && Obj.getURI(last),
  };
});

/** The text of a source object, split into utterances where it is a transcript. */
const readObject = Effect.fnUntraced(function* (agent: Agent.Agent, source: Obj.Unknown) {
  if (Obj.instanceOf(Markdown.Document, source)) {
    const { content } = yield* Database.load(source.content);
    return { name: source.name ?? 'Document', text: content, segments: segmentMarkdown(content) };
  }
  if (Obj.instanceOf(Text.Text, source)) {
    return { name: 'Text', text: source.content, segments: segmentMarkdown(source.content) };
  }
  if (Obj.instanceOf(Chat.Chat, source)) {
    return yield* readChat(agent, source);
  }
  return yield* Effect.fail(
    new AgentOperationError({ message: 'The source must be a markdown document, text or chat.' }),
  );
});

const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim().toLowerCase();

/** Whether the fact quotes one of the segments; on an incremental read only facts from new messages are kept. */
const quotesAny = (fact: RDF.Fact, segments: readonly Segment[]): boolean => {
  const quote = fact.assertion.quote ? normalize(fact.assertion.quote) : undefined;
  return quote !== undefined && segments.some(({ text }) => normalize(text).includes(quote));
};

/**
 * Attributes a fact to the utterance its quote comes from; the extractor sees the whole transcript
 * so pronouns resolve, and only knows the speaker of a fact through its quote.
 */
const attribute = (fact: RDF.Fact, segments: readonly Segment[], roster: Identity.Roster): RDF.Fact => {
  const quote = fact.assertion.quote ? normalize(fact.assertion.quote) : undefined;
  const segment = quote ? segments.find(({ text }) => normalize(text).includes(quote)) : undefined;
  const resolved = Identity.resolveFact(roster, fact);
  if (!segment) {
    return resolved;
  }

  const entity = segment.entity ?? (segment.speaker ? Identity.resolveName(roster, segment.speaker) : undefined);
  return {
    ...resolved,
    attribution: {
      ...resolved.attribution,
      ...(entity ? { agent: entity } : {}),
      ...(segment.source ? { source: segment.source } : {}),
      ...(segment.at ? { generatedAtTime: segment.at } : {}),
    },
  };
};

export type ReadSourceResult = {
  /** The marker closing the pass; absent when a chat has no messages since the last read. */
  pass?: FactEntry.ExtractionPass;
  facts: readonly RDF.Fact[];
  /** A chat's rendered window: the context lines before the new messages, then the new ones. */
  transcript?: string;
};

export type ReadSourceProps = {
  source?: Obj.Unknown;
  url?: string;
  /** The text to read in place of the source's own. */
  text?: string;
};

/**
 * Reads a source into its annotation feed — one entry per fact, then the pass's marker — and returns the
 * marker and the facts. A chat is read from the message after the last marker's cursor, so re-reading it never repeats a fact;
 * nothing is appended when no message was added since. The messages before the cursor are shown to the
 * extractor as context, but only facts quoting a new message are kept.
 */
export const readSource: (
  agent: Agent.Agent,
  props: ReadSourceProps,
) => Effect.Effect<
  ReadSourceResult,
  AgentOperationError | EntityNotFoundError | SemanticIndexError,
  Database.Service | AiService.AiService
> = Effect.fnUntraced(function* (agent, { source, url, text }) {
  if (source && Obj.instanceOf(Chat.Chat, source) && text === undefined) {
    const feed = yield* ensureAnnotationFeed(agent, { id: source.id, name: source.name ?? 'Conversation' });
    const passes = inAppendOrder(yield* Feed.query(feed, Filter.type(FactEntry.ExtractionPass)).run);
    const cursor = passes.findLast((pass) => pass.through !== undefined)?.through;
    const { through, transcript, ...read } = yield* readChat(agent, source, cursor);
    if (through === cursor) {
      return { facts: [] };
    }
    const facts = yield* extract(read, Obj.getURI(source));
    const fresh = cursor === undefined ? facts : facts.filter((fact) => quotesAny(fact, read.segments));
    return { ...(yield* record(feed, { source, name: read.name, through }, fresh)), transcript };
  }

  const read: SourceText = source
    ? { uri: Obj.getURI(source), ...(yield* readObject(agent, source)) }
    : { uri: url ?? '', name: url ?? '', text: '', segments: [] };
  const body = text === undefined ? read : { ...read, text, segments: segmentMarkdown(text) };
  const feed = yield* ensureAnnotationFeed(agent, { id: source?.id ?? body.uri, name: body.name });
  return yield* record(feed, { source, url, name: body.name }, yield* extract(body, body.uri));
});

// A direct model call rather than a chat turn: extraction is a pure derivation of the text.
const extract = (body: Pick<SourceText, 'text' | 'segments'>, uri: string) =>
  body.segments.length === 0 && body.text.trim().length === 0
    ? Effect.succeed([])
    : Effect.all([extractDocFacts({ text: body.text, source: uri }), Identity.loadRoster]).pipe(
        Effect.map(([facts, roster]) => facts.map((fact) => attribute(fact, body.segments, roster))),
      );

/** Appends each fact as its own entry, then the pass marker: a pass is complete once its marker is in the feed. */
const record = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  { source, url, name, through }: { source?: Obj.Unknown; url?: string; name: string; through?: string },
  extracted: RDF.Fact[],
) {
  const pass = Obj.make(FactEntry.ExtractionPass, {
    ...(source ? { source: Ref.make(source) } : {}),
    ...(url ? { url } : {}),
    ...(through ? { through } : {}),
    name,
    recordedAt: new Date().toISOString(),
    extractor: extracted[0]?.extractor ?? EXTRACTOR,
    facts: extracted.length,
  });
  const facts = extracted.map((fact): RDF.Fact => ({ ...fact, pass: pass.id }));
  const entries = facts.map((fact) =>
    Obj.make(FactEntry.FactEntry, { [Obj.Meta]: { keys: [FactEntry.factKey(fact.id)] }, fact }),
  );
  yield* Feed.append(feed, [...entries, pass]);
  yield* Database.flush();
  return { pass, facts };
});

const handler: Operation.WithHandler<typeof AgentOperation.ReadSource> = AgentOperation.ReadSource.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, source: sourceRef, url, text }) {
      if (!sourceRef && (url === undefined || text === undefined)) {
        return yield* Effect.fail(
          new AgentOperationError({ message: 'Pass a source object, or the url of a web page with its text.' }),
        );
      }

      const agent = yield* Database.load(agentRef);
      const source = sourceRef ? yield* Database.load(sourceRef) : undefined;
      const { pass, facts } = yield* readSource(agent, { source, url, text });
      return { ...(pass ? { pass: Ref.make(pass) } : {}), facts: facts.length };
    }),
  ),
);

export default handler;
