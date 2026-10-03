//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Order from 'effect/Order';

import type * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { type RDF, extractDocFacts, normalizeEntityId } from '@dxos/pipeline-rdf';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';

import { AgentOperation, FactEntry, Profile } from '#types';

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

/** The display name of a message's sender: its name, its contact, or its role. */
const speakerOf = Effect.fnUntraced(function* (agent: Agent.Agent, message: Message.Message) {
  if (message.sender.name) {
    return message.sender.name;
  }
  if (message.sender.contact) {
    return Profile.displayName(yield* Database.load(message.sender.contact));
  }
  return message.sender.role === 'assistant' ? (agent.name ?? 'Agent') : 'User';
});

/** The chat's messages in append order, each as a `[time] speaker: text` line. */
const readChat = Effect.fnUntraced(function* (agent: Agent.Agent, chat: Chat.Chat) {
  const feed = yield* Database.load(chat.feed);
  const messages = [...(yield* Feed.query(feed, Filter.type(Message.Message)).run)].sort(
    Order.mapInput(Order.Number, Feed.getPosition),
  );
  const segments: Segment[] = [];
  for (const message of messages) {
    const text = Message.extractText(message).trim();
    if (message.sender.role === 'tool' || text.length === 0) {
      continue;
    }
    segments.push({
      text,
      speaker: yield* speakerOf(agent, message),
      source: Obj.getURI(message),
      at: message.created,
    });
  }
  return {
    name: chat.name ?? 'Conversation',
    text: segments.map(({ text, speaker, at }) => `[${at}] ${speaker}: ${text}`).join('\n'),
    segments,
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
      const read: SourceText = source
        ? { uri: Obj.getURI(source), ...(yield* readObject(agent, source)) }
        : { uri: url ?? '', name: url ?? '', text: '', segments: [] };
      const body = text === undefined ? read : { ...read, text, segments: segmentMarkdown(text) };

      // A direct model call rather than a chat turn: extraction is a pure derivation of the text.
      const facts = (yield* extractDocFacts({ text: body.text, source: body.uri })).map((fact) =>
        attribute(fact, body.segments),
      );

      const feed = yield* ensureAnnotationFeed(agent, { id: source?.id ?? body.uri, name: body.name });
      const entry = Obj.make(FactEntry.FactEntry, {
        ...(source ? { source: Ref.make(source) } : {}),
        ...(url ? { url } : {}),
        name: body.name,
        recordedAt: new Date().toISOString(),
        extractor: facts[0]?.extractor ?? EXTRACTOR,
        facts,
      });
      yield* Feed.append(feed, [entry]);
      yield* Database.flush();

      return { entry: Ref.make(entry), facts: facts.length };
    }),
  ),
);

export default handler;
