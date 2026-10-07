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

const EXTRACTOR: FactEntry.Extractor = { id: 'org.dxos.pipeline-rdf.extract', model: 'default', version: '1' };

/** One utterance of a source, so a fact quoting it can be attributed to its speaker and time. */
type Segment = {
  text: string;
  speaker?: string;
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

/**
 * The display name of a message's sender: its name, its contact, the person a participant chat is with
 * (Composer's prompts carry neither name nor contact, and a goal watching that person's words matches by
 * name), or its role.
 */
const speakerOf = Effect.fnUntraced(function* (
  agent: Agent.Agent,
  message: Message.Message,
  participant: Obj.Unknown | undefined,
) {
  if (message.sender.name) {
    return message.sender.name;
  }
  if (message.sender.contact) {
    return Profile.displayName(yield* Database.load(message.sender.contact));
  }
  if (message.sender.role === 'assistant') {
    return agentSpeaker(agent);
  }
  return participant ? Profile.displayName(participant) : 'User';
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
  const toSegment = Effect.fnUntraced(function* (message: Message.Message) {
    // Synthetic text (a woken chat's relay, system notes) is not something anyone said.
    const text = message.blocks
      .flatMap((block) => (block._tag === 'text' && block.disposition !== 'synthetic' ? [block.text] : []))
      .join('\n')
      .trim();
    if (message.sender.role === 'tool' || text.length === 0) {
      return undefined;
    }
    return {
      text,
      speaker: yield* speakerOf(agent, message, participant),
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
const attribute = (fact: RDF.Fact, segments: readonly Segment[]): RDF.Fact => {
  const quote = fact.assertion.quote ? normalize(fact.assertion.quote) : undefined;
  const segment = quote ? segments.find(({ text }) => normalize(text).includes(quote)) : undefined;
  if (!segment) {
    return fact;
  }

  return {
    ...fact,
    attribution: {
      ...fact.attribution,
      ...(segment.speaker ? { agent: normalizeEntityId(segment.speaker) } : {}),
      ...(segment.source ? { source: segment.source } : {}),
      ...(segment.at ? { generatedAtTime: segment.at } : {}),
    },
  };
};

export type ReadSourceResult = {
  entry?: FactEntry.FactEntry;
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
 * Reads a source into its annotation feed and returns the entry appended with the facts it holds. A
 * chat is read from the message after the last entry's cursor, so re-reading it never repeats a fact;
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
    const entries = inAppendOrder(yield* Feed.query(feed, Filter.type(FactEntry.FactEntry)).run);
    const cursor = entries.findLast((entry) => entry.through !== undefined)?.through;
    const { through, transcript, ...read } = yield* readChat(agent, source, cursor);
    if (through === cursor) {
      return { entry: undefined, facts: [] };
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
    : extractDocFacts({ text: body.text, source: uri }).pipe(
        Effect.map((facts) => facts.map((fact) => attribute(fact, body.segments))),
      );

const record = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  { source, url, name, through }: { source?: Obj.Unknown; url?: string; name: string; through?: string },
  facts: RDF.Fact[],
) {
  const entry = Obj.make(FactEntry.FactEntry, {
    ...(source ? { source: Ref.make(source) } : {}),
    ...(url ? { url } : {}),
    ...(through ? { through } : {}),
    name,
    recordedAt: new Date().toISOString(),
    extractor: facts[0]?.extractor ?? EXTRACTOR,
    facts,
  });
  yield* Feed.append(feed, [entry]);
  yield* Database.flush();
  return { entry, facts: entry.facts };
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
      const { entry, facts } = yield* readSource(agent, { source, url, text });
      return { ...(entry ? { entry: Ref.make(entry) } : {}), facts: facts.length };
    }),
  ),
);

export default handler;
