//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj } from '@dxos/echo';
import { DEFAULT_MODEL, RDF, extractDocFacts } from '@dxos/pipeline-rdf';

import { AgentOperation, FactFeed } from '#types';

/** The shape of a message feed item the extractor reads, as live object JSON or a raw feed payload. */
const MessageItem = Schema.Struct({
  'created': Schema.optional(Schema.String),
  'sender': Schema.optional(Schema.Struct({ name: Schema.optional(Schema.String) })),
  'blocks': Schema.Array(Schema.Struct({ _tag: Schema.String, text: Schema.optional(Schema.String) })),
  '@meta': Schema.optional(
    Schema.Struct({ keys: Schema.Array(Schema.Struct({ source: Schema.String, id: Schema.String })) }),
  ),
});

const decodeItem = Schema.decodeUnknownOption(MessageItem);

/** One message the extractor reads. */
type Utterance = { id: string; url: string; speaker: string; at?: string; text: string };

const DEFAULT_ID_SOURCE = 'discord.com';
const INTEGER_ID = /^\d+$/;

/** A message as an utterance, or none when it has no text or no ordered id in `idSource`. */
const toUtterance = (item: unknown, source: string, idSource: string): Utterance | undefined => {
  const decoded = decodeItem(Obj.isObject(item) ? Obj.toJSON(item) : item);
  if (Option.isNone(decoded)) {
    return undefined;
  }
  const { created, sender, blocks, '@meta': meta } = decoded.value;
  const id = meta?.keys.find((key) => key.source === idSource)?.id;
  const text = blocks
    .flatMap((block) => (block._tag === 'text' && block.text ? [block.text] : []))
    .join('\n')
    .trim();
  if (id === undefined || !INTEGER_ID.test(id) || text.length === 0) {
    return undefined;
  }
  return { id, url: `${source}/${id}`, speaker: sender?.name ?? 'Unknown', at: created, text };
};

const inRange = ({ at }: Utterance, since?: string, until?: string): boolean =>
  at === undefined || ((since === undefined || at >= since) && (until === undefined || at <= until));

const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim().toLowerCase();

/** Cites the message a fact quotes; the extractor sees the batch as one transcript so references resolve. */
const attribute = (fact: RDF.Fact, utterances: readonly Utterance[]): RDF.Fact => {
  const quote = fact.assertion.quote ? normalize(fact.assertion.quote) : undefined;
  const utterance = quote ? utterances.find(({ text }) => normalize(text).includes(quote)) : undefined;
  return utterance
    ? {
        ...fact,
        attribution: {
          ...fact.attribution,
          agent: utterance.speaker,
          source: utterance.url,
          ...(utterance.at ? { generatedAtTime: utterance.at } : {}),
        },
      }
    : fact;
};

const byId = (left: Utterance, right: Utterance): number => (BigInt(left.id) < BigInt(right.id) ? -1 : 1);

const handler: Operation.WithHandler<typeof AgentOperation.ExtractFacts> = AgentOperation.ExtractFacts.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ items, facts: factsRef, source, idSource, since, until, model }) {
      const feed = yield* Database.load(factsRef);
      const extractor = { id: 'agent.extractFacts', model: model ?? DEFAULT_MODEL, version: '1' };
      const extractorKey = FactFeed.extractorKey(extractor);
      const passes = yield* FactFeed.loadPasses(feed);

      const utterances = items
        .map((item) => toUtterance(item, source, idSource ?? DEFAULT_ID_SOURCE))
        .filter((utterance): utterance is Utterance => utterance !== undefined)
        .filter((utterance) => inRange(utterance, since, until))
        .filter((utterance) => !FactFeed.isCovered(passes, extractorKey, source, utterance.id))
        .sort(byId);
      const skipped = items.length - utterances.length;
      const first = utterances.at(0);
      const last = utterances.at(-1);
      if (!first || !last) {
        return { facts: 0, read: 0, skipped };
      }

      const pass = `${extractorKey}:${source}:${first.id}-${last.id}`;
      const transcript = utterances.map(({ at, speaker, text }) => `[${at ?? ''}] ${speaker}: ${text}`).join('\n');
      const extracted = yield* extractDocFacts({ text: transcript, source }, { ...(model ? { model } : {}) });
      // Citations change the provenance statements share, so the facts are placed in their graphs again.
      const facts = RDF.Graph.assign(
        extracted.map(({ graph: _, ...fact }) => ({ ...attribute(fact, utterances), extractor, pass })),
      );

      yield* Feed.append(feed, [
        ...facts.map(FactFeed.makeItem),
        Obj.make(FactFeed.ExtractionPass, {
          pass,
          extractor: extractorKey,
          coverage: [{ source, first: first.id, last: last.id }],
          facts: facts.length,
        }),
      ]);
      return { facts: facts.length, read: utterances.length, skipped };
    }),
  ),
);

export default handler;
