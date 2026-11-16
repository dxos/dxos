//
// Copyright 2026 DXOS.org
//

// Classifies every human message in an insights database (see `build.ts`) with Claude Haiku 5.5: what kind of message
// it is, its tone, a short topic, and the Cloudflare products it mentions with the tone toward each. Messages already
// classified are skipped, so a rerun only pays for new ones. Needs DX_ANTHROPIC_API_KEY.
//
//   pnpm exec tsx src/testing/insights/classify.ts --db <insights.db> [--limit <n>] [--concurrency <n>]

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';

import { AiService, AiUsage } from '@dxos/ai';
import { DirectAiServiceLayer } from '@dxos/ai/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DEFAULT_MODEL } from '@dxos/pipeline-rdf';

import { costReport, meter } from '../metering.ts';
import { KINDS, PRODUCTS } from './products.ts';

const Payload = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      kind: Schema.String,
      sentiment: Schema.Number,
      topic: Schema.String,
      products: Schema.Array(Schema.Struct({ product: Schema.String, sentiment: Schema.Number })),
    }),
  ),
});

const SYSTEM = `You classify messages from the Cloudflare Developers Discord server. For each message, answer with its id and:
- kind: one of ${KINDS.join(', ')}. "answer" is a message that helps someone else (a fix, an explanation, a pointer); "bug-report" says something of Cloudflare's is broken; "feedback" is an opinion about a Cloudflare product, good or bad.
- sentiment: the author's tone from -1 (angry, frustrated) through 0 (neutral) to 1 (happy, grateful).
- topic: what it is about in at most 6 words, specific ("D1 migration fails on deploy", not "database question").
- products: every Cloudflare product the message is about or uses, each with the author's sentiment toward that product from -1 to 1 (0 when it is only mentioned). Use these names exactly: ${PRODUCTS.join(', ')}. Name another Cloudflare product only if none of these fits. Leave out non-Cloudflare products.
Read the channel and thread for context: a message in #d1-database without a product name is still about D1.`;

type Row = {
  readonly id: string;
  readonly channel: string;
  readonly thread_name: string | null;
  readonly author: string | null;
  readonly text: string;
};

const isRow = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && 'id' in value && 'text' in value && 'channel' in value;

const { values: args } = parseArgs({
  options: {
    db: { type: 'string' },
    limit: { type: 'string' },
    concurrency: { type: 'string', default: '6' },
    batch: { type: 'string', default: '30' },
  },
});
if (!args.db) {
  console.error('Usage: classify.ts --db <insights.db> [--limit <n>]');
  process.exit(1);
}
if (!process.env.DX_ANTHROPIC_API_KEY) {
  console.error('Set DX_ANTHROPIC_API_KEY (see .secrets/anthropic.env).');
  process.exit(1);
}

const db = new DatabaseSync(args.db);
const pending = db
  .prepare(
    `SELECT m.id, m.channel, m.thread_name, m.author, m.text FROM message m
     LEFT JOIN classification c ON c.message_id = m.id
     WHERE m.is_bot = 0 AND c.message_id IS NULL ORDER BY m.ts ${args.limit ? `LIMIT ${Number(args.limit)}` : ''}`,
  )
  .all()
  .filter(isRow);
const size = Number(args.batch);
const batches = Array.from({ length: Math.ceil(pending.length / size) }, (_, index) =>
  pending.slice(index * size, (index + 1) * size),
);
console.log(`${pending.length} messages to classify in ${batches.length} batches.`);

const insertClassification = db.prepare('INSERT OR REPLACE INTO classification VALUES (?, ?, ?, ?, ?)');
const insertMention = db.prepare('INSERT OR REPLACE INTO product_mention VALUES (?, ?, ?)');
const clamp = (value: number) => Math.max(-1, Math.min(1, value));

const classifyBatch = (batch: readonly Row[]) =>
  Effect.gen(function* () {
    const listing = batch
      .map(
        (row) =>
          `<message id="${row.id}" channel="#${row.channel}"${row.thread_name ? ` thread="${row.thread_name.replace(/"/g, "'")}"` : ''} author="${(row.author ?? '').replace(/"/g, "'")}">\n${row.text.slice(0, 800)}\n</message>`,
      )
      .join('\n');
    const response = yield* LanguageModel.generateObject({
      schema: Payload,
      prompt: [
        { role: 'system', content: SYSTEM, options: { anthropic: { cacheControl: { type: 'ephemeral' } } } },
        { role: 'user', content: listing },
      ],
    });
    const known = new Set(batch.map((row) => row.id));
    for (const item of response.value.items) {
      if (!known.has(item.id)) {
        continue;
      }
      const kind = KINDS.find((candidate) => candidate === item.kind) ?? 'other';
      insertClassification.run(item.id, kind, clamp(item.sentiment), item.topic, DEFAULT_MODEL);
      for (const mention of item.products) {
        insertMention.run(item.id, mention.product, clamp(mention.sentiment));
      }
    }
    return response.value.items.length;
  }).pipe(
    AiUsage.withStage('classify-messages'),
    Effect.provide(AiService.languageModel(DEFAULT_MODEL, { thinking: false })),
    Effect.catch((error) => Effect.logWarning(`batch failed: ${String(error)}`).pipe(Effect.as(0))),
  );

const metering = meter(DirectAiServiceLayer, join(dirname(args.db), 'classify-trace.jsonl'));
const program = Effect.gen(function* () {
  let done = 0;
  yield* Effect.forEach(
    batches,
    (batch) =>
      classifyBatch(batch).pipe(
        Effect.tap((count) =>
          Effect.sync(() => {
            done += count;
            process.stdout.write(`\r  ${done}/${pending.length}`);
          }),
        ),
      ),
    { concurrency: Number(args.concurrency), discard: true },
  );
  process.stdout.write('\n');
  for (const line of costReport(metering.events(), done)) {
    console.log(line);
  }
}).pipe(Effect.provide(metering.layer));

void EffectEx.runPromise(program)
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.close());
