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
import { type Space } from '@dxos/halo';
import { type RDF, type SemanticIndexError, extractDocFacts } from '@dxos/pipeline-rdf';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';

import { AgentOperation, ChatParticipant, FactEntry } from '#types';

import { ensureAnnotationFeed } from './annotations.ts';
import { AgentOperationError } from './errors.ts';
import { agentId, loadMembers, memberByDid, memberByName, personDid, resolveTerms } from './members.ts';

const EXTRACTOR: FactEntry.Extractor = { id: 'org.dxos.pipeline-rdf.extract', model: 'default', version: '1' };

/** One utterance of a source, so a fact quoting it can be attributed to its speaker and time. */
type Segment = {
  text: string;
  /** The name the speaker appears under in the rendered transcript. */
  speaker?: string;
  /** Who said it, when known: a member's id (identity DID) and display name. */
  speakerId?: string;
  speakerLabel?: string;
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

type Speaker = Pick<Segment, 'speaker' | 'speakerId' | 'speakerLabel'>;

/**
 * A member speaks under the name they signed with, else their display name; one with neither appears under a
 * handle derived from their DID.
 */
const memberSpeaker = (members: readonly Space.Member[], did: string, name?: string): Speaker => {
  const label = name ?? memberByDid(members, did)?.displayName;
  return { speaker: label ?? `Member ${did.slice(-6)}`, speakerId: did, ...(label ? { speakerLabel: label } : {}) };
};

/** A name in a transcript is a member's when it resolves to one; otherwise it stays a bare name. */
const namedSpeaker = (members: readonly Space.Member[], name: string): Speaker => {
  const did = memberByName(members, name)?.did;
  return did ? memberSpeaker(members, did, name) : { speaker: name, speakerLabel: name };
};

const segmentMarkdown = (members: readonly Space.Member[], content: string): Segment[] =>
  content.split(/\n\s*\n/).map((paragraph) => {
    const match = paragraph.trim().match(SPEAKER_LINE);
    return match
      ? { ...namedSpeaker(members, match[1].trim()), text: paragraph.trim().slice(match[0].length) }
      : { text: paragraph };
  });

/**
 * Who sent a message: a space member by identity DID (stamped on the prompt or recorded on their contact), the
 * agent itself, a signed name resolved against the members, or else the person a participant chat is with.
 */
const speakerOf = Effect.fnUntraced(function* (
  agent: Agent.Agent,
  members: readonly Space.Member[],
  message: Message.Message,
  participant: Obj.Unknown | undefined,
) {
  const { sender } = message;
  if (sender.identityDid) {
    return memberSpeaker(members, sender.identityDid, sender.name);
  }
  if (sender.role === 'assistant') {
    return {
      speaker: agent.name ?? 'Agent',
      speakerId: agentId(agent),
      ...(agent.name ? { speakerLabel: agent.name } : {}),
    };
  }
  const contactDid = sender.contact ? personDid(yield* Database.load(sender.contact)) : undefined;
  if (contactDid) {
    return memberSpeaker(members, contactDid, sender.name);
  }
  // A signed name is who said it, even in a participant chat: someone else may write there.
  if (sender.name) {
    return namedSpeaker(members, sender.name);
  }
  const participantDid = participant ? personDid(participant) : undefined;
  return participantDid ? memberSpeaker(members, participantDid) : ({ speaker: 'User' } satisfies Speaker);
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
const readChat = Effect.fnUntraced(function* (
  members: readonly Space.Member[],
  agent: Agent.Agent,
  chat: Chat.Chat,
  after?: string,
) {
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
      ...(yield* speakerOf(agent, members, message, participant)),
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
const readObject = Effect.fnUntraced(function* (
  members: readonly Space.Member[],
  agent: Agent.Agent,
  source: Obj.Unknown,
) {
  if (Obj.instanceOf(Markdown.Document, source)) {
    const { content } = yield* Database.load(source.content);
    return { name: source.name ?? 'Document', text: content, segments: segmentMarkdown(members, content) };
  }
  if (Obj.instanceOf(Text.Text, source)) {
    return { name: 'Text', text: source.content, segments: segmentMarkdown(members, source.content) };
  }
  if (Obj.instanceOf(Chat.Chat, source)) {
    return yield* readChat(members, agent, source);
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

const FIRST_PERSON = new Set(['i', 'me', 'myself']);

/** A first-person term the extractor left unresolved names the speaker of the utterance it quotes. */
const selfTerm = (term: RDF.Term, segment: Segment): RDF.Term =>
  term.kind === 'entity' && segment.speakerId && FIRST_PERSON.has((term.label ?? term.entity).trim().toLowerCase())
    ? { kind: 'entity', entity: segment.speakerId, ...(segment.speakerLabel ? { label: segment.speakerLabel } : {}) }
    : term;

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
    assertion: {
      ...fact.assertion,
      subject: selfTerm(fact.assertion.subject, segment),
      object: selfTerm(fact.assertion.object, segment),
    },
    attribution: {
      ...fact.attribution,
      ...(segment.speakerId ? { agent: segment.speakerId } : {}),
      ...(segment.speakerLabel ? { agentLabel: segment.speakerLabel } : {}),
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
  Database.Service | AiService.AiService | Space.Service
> = Effect.fnUntraced(function* (agent, { source, url, text }) {
  if (source && Obj.instanceOf(Chat.Chat, source) && text === undefined) {
    const feed = yield* ensureAnnotationFeed(agent, { id: source.id, name: source.name ?? 'Conversation' });
    const passes = inAppendOrder(yield* Feed.query(feed, Filter.type(FactEntry.ExtractionPass)).run);
    const cursor = passes.findLast((pass) => pass.through !== undefined)?.through;
    const members = yield* loadMembers;
    const { through, transcript, ...read } = yield* readChat(members, agent, source, cursor);
    if (through === cursor) {
      return { facts: [] };
    }
    const facts = yield* extract(members, read, Obj.getURI(source));
    const fresh = cursor === undefined ? facts : facts.filter((fact) => quotesAny(fact, read.segments));
    return { ...(yield* record(feed, { source, name: read.name, through }, fresh)), transcript };
  }

  const members = yield* loadMembers;
  const read: SourceText = source
    ? { uri: Obj.getURI(source), ...(yield* readObject(members, agent, source)) }
    : { uri: url ?? '', name: url ?? '', text: '', segments: [] };
  const body = text === undefined ? read : { ...read, text, segments: segmentMarkdown(members, text) };
  const feed = yield* ensureAnnotationFeed(agent, { id: source?.id ?? body.uri, name: body.name });
  return yield* record(feed, { source, url, name: body.name }, yield* extract(members, body, body.uri));
});

// A direct model call rather than a chat turn: extraction is a pure derivation of the text.
const extract = (members: readonly Space.Member[], body: Pick<SourceText, 'text' | 'segments'>, uri: string) =>
  body.segments.length === 0 && body.text.trim().length === 0
    ? Effect.succeed([])
    : extractDocFacts({ text: body.text, source: uri }).pipe(
        Effect.map((facts) => facts.map((fact) => attribute(resolveTerms(members, fact), body.segments))),
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
