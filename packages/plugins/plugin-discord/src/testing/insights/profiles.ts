//
// Copyright 2026 DXOS.org
//

// Writes a short profile of the community's most interesting people: the external members who help others most, and
// the people who ask most. Each profile is drawn from that person's own messages (Claude Haiku 5.5 with thinking): who
// they seem to be, what they build, which products they use and how they feel about them, and why they matter.
// Needs DX_ANTHROPIC_API_KEY.
//
//   pnpm exec tsx src/testing/insights/profiles.ts --db <insights.db> [--helpers <n>] [--askers <n>]
//
// Table: profile(author_id, author, role, why, summary, products, messages), rebuilt each run.

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
  summary: Schema.String,
  builds: Schema.String,
  expertise: Schema.String,
  products: Schema.Array(Schema.Struct({ product: Schema.String, sentiment: Schema.Number })),
  notable: Schema.String,
});

const SYSTEM = `You write a short, factual profile of one member of the Cloudflare Developers Discord from their own messages, for Cloudflare's developer relations and sales teams. Answer with:
- summary: who they appear to be in two sentences (role, company or project if they say, how they use Cloudflare).
- builds: what they are building, in one sentence, or "unknown".
- expertise: their level (beginner, practitioner, expert) and the areas they know well.
- products: the Cloudflare products they use or discuss, each with their sentiment toward it from -1 to 1.
- notable: one sentence on why this person matters to Cloudflare (a power user who answers others, a frustrated customer at risk, a heavy user of a new product, …).
Use only what the messages say; do not invent employers or projects.`;

const Person = Schema.Struct({
  author_id: Schema.String,
  author: Schema.String,
  role: Schema.String,
  n: Schema.Number,
});
type Person = typeof Person.Type;
const isPerson = Schema.is(Person);
const Line = Schema.Struct({ channel: Schema.String, thread: Schema.String, text: Schema.String });
const isLine = Schema.is(Line);

const { values: args } = parseArgs({
  options: {
    db: { type: 'string' },
    helpers: { type: 'string', default: '12' },
    askers: { type: 'string', default: '8' },
  },
});
if (!args.db || !process.env.DX_ANTHROPIC_API_KEY) {
  console.error('Usage: profiles.ts --db <insights.db> (with DX_ANTHROPIC_API_KEY set)');
  process.exit(1);
}

const db = new DatabaseSync(args.db);
db.exec(`DROP TABLE IF EXISTS profile;
CREATE TABLE profile (author_id TEXT PRIMARY KEY, author TEXT, role TEXT, why TEXT, summary TEXT, builds TEXT,
  expertise TEXT, products TEXT, notable TEXT, messages INTEGER)`);

// External helpers: people who are not staff, answering in others' threads or replying to others.
const helpers = db
  .prepare(
    `SELECT author_id, COALESCE(MAX(author), author_id) AS author, 'helper' AS role, COUNT(*) AS n FROM (
       SELECT m.author_id, m.author,
         CASE WHEN m.reply_author_id IS NOT NULL AND m.reply_author_id <> m.author_id THEN m.reply_author_id
              WHEN t.starter_id IS NOT NULL AND t.starter_id <> m.author_id THEN t.starter_id END AS person
       FROM message m LEFT JOIN thread t ON t.id = m.thread LEFT JOIN member mb ON mb.id = m.author_id
       WHERE m.is_bot = 0 AND COALESCE(mb.staff, 0) = 0 AND COALESCE(mb.former, 0) = 0
     ) WHERE person IS NOT NULL
     GROUP BY author_id ORDER BY COUNT(DISTINCT person) DESC, n DESC LIMIT ?`,
  )
  .all(Number(args.helpers))
  .filter(isPerson);
const askers = db
  .prepare(
    `SELECT m.author_id, COALESCE(MAX(m.author), m.author_id) AS author, 'asker' AS role, COUNT(*) AS n FROM message m
     JOIN classification c ON c.message_id = m.id LEFT JOIN member mb ON mb.id = m.author_id
     WHERE m.is_bot = 0 AND COALESCE(mb.staff, 0) = 0 AND COALESCE(mb.former, 0) = 0
       AND c.kind IN ('question', 'bug-report')
     GROUP BY m.author_id ORDER BY n DESC LIMIT ?`,
  )
  .all(Number(args.askers))
  .filter(isPerson);
const people = [...new Map([...helpers, ...askers].map((person) => [person.author_id, person])).values()];
console.log(`Profiling ${people.length} people (${helpers.length} helpers, ${askers.length} askers).`);

const messagesOf = db.prepare(
  `SELECT channel, COALESCE(thread_name, '') AS thread, text FROM message WHERE author_id = ? ORDER BY ts DESC LIMIT 80`,
);
const insert = db.prepare('INSERT OR REPLACE INTO profile VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const lineOf = (row: unknown): string =>
  isLine(row)
    ? `[#${row.channel}${row.thread ? ` / ${row.thread}` : ''}] ${row.text.replace(/\s+/g, ' ').slice(0, 400)}`
    : '';

const profile = (person: Person) =>
  Effect.gen(function* () {
    const lines = messagesOf.all(person.author_id).map(lineOf).filter(Boolean);
    const response = yield* LanguageModel.generateObject({
      schema: Payload,
      prompt: [
        { role: 'system', content: SYSTEM, options: { anthropic: { cacheControl: { type: 'ephemeral' } } } },
        { role: 'user', content: `Member: ${person.author}\n\nTheir messages, newest first:\n${lines.join('\n')}` },
      ],
    });
    const value = response.value;
    insert.run(
      person.author_id,
      person.author,
      person.role,
      `${person.n} ${person.role === 'helper' ? 'helping messages' : 'questions and bug reports'}`,
      value.summary,
      value.builds,
      value.expertise,
      value.products.map(({ product, sentiment }) => `${product} ${sentiment >= 0 ? '+' : ''}${sentiment}`).join(', '),
      value.notable,
      lines.length,
    );
  }).pipe(
    AiUsage.withStage('profiles'),
    Effect.provide(AiService.languageModel(DEFAULT_MODEL, { thinking: true })),
    Effect.catch((error) =>
      Effect.sync(() => {
        failed++;
        console.warn(`${person.author} failed: ${String(error)}`);
      }),
    ),
  );

let failed = 0;

const metering = meter(DirectAiServiceLayer, join(dirname(args.db), 'profiles-trace.jsonl'));
const program = Effect.forEach(people, profile, { concurrency: 4, discard: true }).pipe(
  Effect.tap(() =>
    Effect.sync(() => {
      for (const line of costReport(metering.events(), people.length)) {
        console.log(line);
      }
      if (failed > 0) {
        console.error(`${failed} profiles failed.`);
        process.exitCode = 1;
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
