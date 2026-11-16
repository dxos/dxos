//
// Copyright 2026 DXOS.org
//

// Groups the classified questions and bug reports of each product into recurring problems: what keeps being asked,
// how often, and where that suggests the docs or the product fall short. A system-two pass (Claude Haiku 5.5 with
// thinking) over the topics `classify.ts` wrote. Needs DX_ANTHROPIC_API_KEY.
//
//   pnpm exec tsx src/testing/insights/faq.ts --db <insights.db> [--min <questions per product>]
//
// Table: faq(product, problem, questions, gap, examples), rebuilt each run.

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

const Payload = Schema.Struct({
  problems: Schema.Array(
    Schema.Struct({
      problem: Schema.String,
      gap: Schema.String,
      ids: Schema.Array(Schema.String),
    }),
  ),
});

const SYSTEM = `You read the questions and bug reports developers posted about one Cloudflare product in its Discord community, each as an id and a short topic. Group them into the recurring problems behind them: a problem is one specific thing people get stuck on or report broken, worded so a product manager recognizes it ("D1 migrations fail when run from CI", not "D1 issues"). For each problem give the ids of every item that belongs to it and, in one sentence, the gap it reveals (missing or unclear docs, a missing feature, a bug, a limit people hit). Leave out one-off items that share no problem with another. List the problems most common first.`;

type Item = { readonly id: string; readonly product: string; readonly topic: string; readonly kind: string };

const isItem = (value: unknown): value is Item =>
  typeof value === 'object' && value !== null && 'id' in value && 'product' in value && 'topic' in value;

const { values: args } = parseArgs({
  options: { db: { type: 'string' }, min: { type: 'string', default: '12' } },
});
if (!args.db || !process.env.DX_ANTHROPIC_API_KEY) {
  console.error('Usage: faq.ts --db <insights.db> (with DX_ANTHROPIC_API_KEY set)');
  process.exit(1);
}

const db = new DatabaseSync(args.db);
db.exec(`DROP TABLE IF EXISTS faq;
CREATE TABLE faq (product TEXT NOT NULL, problem TEXT NOT NULL, questions INTEGER NOT NULL, gap TEXT, examples TEXT)`);
const items = db
  .prepare(
    `SELECT c.message_id AS id, p.product, c.topic, c.kind FROM classification c
     JOIN product_mention p ON p.message_id = c.message_id
     WHERE c.kind IN ('question', 'bug-report')`,
  )
  .all()
  .filter(isItem);
const byProduct = Map.groupBy(items, (item) => item.product);
const products = [...byProduct].filter(([, group]) => group.length >= Number(args.min));
console.log(`${items.length} questions and bug reports; grouping ${products.length} products.`);

const insert = db.prepare('INSERT INTO faq VALUES (?, ?, ?, ?, ?)');
const textOf = db.prepare('SELECT text FROM message WHERE id = ?');

const groupProduct = (product: string, group: readonly Item[]) =>
  Effect.gen(function* () {
    const listing = group.map((item) => `${item.id} [${item.kind}] ${item.topic}`).join('\n');
    const response = yield* LanguageModel.generateObject({
      schema: Payload,
      prompt: [
        { role: 'system', content: SYSTEM, options: { anthropic: { cacheControl: { type: 'ephemeral' } } } },
        { role: 'user', content: `Product: ${product}\n\n${listing}` },
      ],
    });
    const known = new Set(group.map((item) => item.id));
    for (const problem of response.value.problems) {
      const ids = problem.ids.filter((id) => known.has(id));
      if (ids.length < 2) {
        continue;
      }
      const examples = ids.slice(0, 3).flatMap((id) => {
        const row = textOf.get(id);
        return row && typeof row === 'object' && 'text' in row && typeof row.text === 'string'
          ? [row.text.replace(/\s+/g, ' ').slice(0, 160)]
          : [];
      });
      insert.run(product, problem.problem, ids.length, problem.gap, examples.join(' | '));
    }
  }).pipe(
    AiUsage.withStage('faq'),
    Effect.provide(AiService.languageModel(DEFAULT_MODEL, { thinking: true })),
    Effect.catch((error) => Effect.logWarning(`${product} failed: ${String(error)}`)),
  );

const metering = meter(DirectAiServiceLayer, join(dirname(args.db), 'faq-trace.jsonl'));
const program = Effect.forEach(products, ([product, group]) => groupProduct(product, group), {
  concurrency: 4,
  discard: true,
}).pipe(
  Effect.tap(() =>
    Effect.sync(() => {
      for (const line of costReport(metering.events(), items.length)) {
        console.log(line);
      }
    }),
  ),
  Effect.provide(metering.layer),
);

void EffectEx.runPromise(program)
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.close());
