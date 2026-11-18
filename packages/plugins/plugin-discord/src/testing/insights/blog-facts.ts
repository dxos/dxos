//
// Copyright 2026 DXOS.org
//

// Runs the standard fact extractor (pipeline-rdf `indexFactsBatch`, Claude Haiku 5.5) over the announcements
// `timeline.ts` loaded — Cloudflare's changelog entries and blog posts — into their own fact store, so what Cloudflare
// shipped can be queried with SPARQL next to what the community says. Needs DX_ANTHROPIC_API_KEY.
//
//   pnpm exec tsx src/testing/insights/blog-facts.ts --db <insights.db> --facts <blog-facts.db> [--since <iso date>]

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';

import { DirectAiServiceLayer } from '@dxos/ai/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { FactStoreLive, indexFactsBatch } from '@dxos/pipeline-rdf';
import { type ExtractDocument } from '@dxos/pipeline-rdf';

import { costReport, meter } from '../metering.ts';

const Announcement = Schema.Struct({
  link: Schema.String,
  source: Schema.String,
  title: Schema.String,
  published: Schema.String,
  summary: Schema.NullOr(Schema.String),
});
const isAnnouncement = Schema.is(Announcement);

const BATCH = 20;

const { values: args } = parseArgs({
  options: { db: { type: 'string' }, facts: { type: 'string' }, since: { type: 'string', default: '2026-09-15' } },
});
if (!args.db || !args.facts || !process.env.DX_ANTHROPIC_API_KEY) {
  console.error('Usage: blog-facts.ts --db <insights.db> --facts <blog-facts.db> (with DX_ANTHROPIC_API_KEY set)');
  process.exit(1);
}

const db = new DatabaseSync(args.db);
const announcements = db
  .prepare('SELECT link, source, title, published, summary FROM announcement WHERE published >= ? ORDER BY published')
  .all(args.since)
  .filter(isAnnouncement);
db.close();

const docs: ExtractDocument[] = announcements.map((item) => ({
  text: `${item.title}\n\n${item.summary ?? ''}`.trim(),
  source: item.link,
  author: item.source === 'blog' ? 'Cloudflare Blog' : 'Cloudflare Changelog',
  date: item.published,
}));
console.log(`${docs.length} announcements since ${args.since}.`);

const metering = meter(DirectAiServiceLayer, join(dirname(args.facts), 'blog-facts-trace.jsonl'));
const program = Effect.gen(function* () {
  let facts = 0;
  for (let index = 0; index < docs.length; index += BATCH) {
    const results = yield* indexFactsBatch(docs.slice(index, index + BATCH));
    facts += results.reduce((sum, result) => sum + result.facts.length, 0);
    process.stdout.write(`\r  ${Math.min(index + BATCH, docs.length)}/${docs.length} documents, ${facts} facts`);
  }
  process.stdout.write('\n');
  for (const line of costReport(metering.events(), docs.length)) {
    console.log(line);
  }
}).pipe(Effect.provide(Layer.merge(FactStoreLive.layerFile(args.facts), metering.layer)));

void EffectEx.runPromise(program).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
