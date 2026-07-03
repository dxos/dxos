//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import { existsSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { AiService, Provider } from '@dxos/ai';
import { OllamaAiServiceLayer } from '@dxos/ai/testing';
import { type Database, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { extractContact } from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { type ContentBlock, Message, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import * as Pipeline from '../Pipeline';
import * as Stage from '../Stage';
import { captureSink } from './capture';
import { type ParquetRow, parquetSource } from './parquet';

// The email dataset (https://huggingface.co/datasets/corbt/enron-emails) lives under ROOT_DIR with
// layout `${ROOT_DIR}/data/train-*.parquet`. ROOT_DIR defaults to the local checkout produced by
// `moon run pipeline:setup` (packages/core/compute/pipeline/data/enron-emails); override it via the
// ROOT_DIR env var. The suite is skipped unless that dataset is actually present — it also needs a
// running Ollama (localhost:11434) and the native better-sqlite3 addon — so CI and un-provisioned
// checkouts skip it.
const DEFAULT_ROOT_DIR = fileURLToPath(new URL('../../data/enron-emails', import.meta.url));
const ROOT_DIR = process.env.ROOT_DIR ?? DEFAULT_ROOT_DIR;

// Where the run's serialized outputs are written (git-ignored, under the package's ./data).
const RESULTS_FILE = fileURLToPath(new URL('../../data/results.json', import.meta.url));

const ORGS = [
  { name: 'DXOS', website: 'https://dxos.org' },
  { name: 'Enron', website: 'https://enron.com' },
];

// Gate on the dataset shard directory existing locally.
const HAS_DATASET = existsSync(join(ROOT_DIR, 'data'));

// Local model served by Ollama (model DXN; its final NSID segment must be camelCase). Override via
// OLLAMA_MODEL. Defaults to gpt-oss-20b, which reliably emits schema-conforming structured output for
// `generateObject`; run `moon run pipeline:setup` (or `ollama pull gpt-oss:20b`) to fetch it. A weaker
// model (e.g. OLLAMA_MODEL=com.meta.model.llama-3-2-1b.instruct) may fail structured output and fall
// back to an empty summary.
const MODEL = process.env.OLLAMA_MODEL ?? 'com.openai.model.gpt-oss-20b.default';

// Number of emails drawn from the head of the dataset for one run.
const EMAIL_COUNT = 10;

const asIso = (value: unknown): string => (value instanceof Date ? value : new Date(String(value))).toISOString();

// Map one email row (see the dataset's `dataset_info` schema) to a Message carrying the body as a
// text block. Mirrors `parquet-email.test.ts` so both suites map rows identically.
const emailToMessage = (row: ParquetRow): Message.Message => {
  const block: ContentBlock.Text = { _tag: 'text', text: String(row.body ?? '') };
  return Message.make({
    created: asIso(row.date),
    sender: { email: String(row.from ?? '') },
    blocks: [block],
    properties: {
      messageId: row.message_id,
      subject: row.subject,
      to: row.to,
      cc: row.cc,
      bcc: row.bcc,
      fileName: row.file_name,
    },
  });
};

// Structured output the summarize stage asks the model for.
const SummarySchema = Schema.Struct({
  summary: Schema.String,
  isSpam: Schema.Boolean,
  keywords: Schema.Array(Schema.String),
});

type Summary = Schema.Schema.Type<typeof SummarySchema>;

const SUMMARIZE_PROMPT = trim`
  Summarize the following email in one sentence, decide whether it is spam, and list up to five keywords.
  Respond with ONLY a JSON object of the form {"summary": string, "isSpam": boolean, "keywords": string[]}.
`;

// Model output is untyped JSON, often wrapped in prose/reasoning by local models; extract the first
// object and coerce leniently (field names and types vary between models) rather than strict schema
// validation, which gpt-oss/Ollama frequently fails (`generateObject` → MalformedOutput).
const parseSummary = (raw: string): Summary => {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return { summary: '', isSpam: false, keywords: [] };
  }

  try {
    const parsed = JSON.parse(match[0]);
    const keywords = parsed.keywords;
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      isSpam: parsed.isSpam === true || parsed.spam === true || parsed.is_spam === true,
      keywords: Array.isArray(keywords)
        ? keywords.map((keyword: unknown) => String(keyword))
        : typeof keywords === 'string'
          ? keywords
              .split(',')
              .map((keyword) => keyword.trim())
              .filter(Boolean)
          : [],
    };
  } catch {
    return { summary: '', isSpam: false, keywords: [] };
  }
};

// Running tallies produced by the stats stage; readable after the run for assertions.
type Stats = {
  readonly from: Map<string, number>;
  readonly to: Map<string, number>;
  total: number;
  spam: number;
};

// Shared context threaded through every stage and the sink. The service closure and db are built
// once up-front so each stage's Effect has `R = never` (Pipeline.run carries no requirements type),
// keeping the stages themselves lightweight (Effect + closures) — Cloudflare-Worker-shaped. The heavy
// bits (Ollama runtime, better-sqlite3-backed db) live here in the test harness, which is why the
// whole suite is env-gated.
type Ctx = {
  readonly summarize: (text: string) => Promise<Summary>;
  readonly db: Database.Database;
  readonly stats: Stats;
};

// Stage 1: LLM summarization. Appends a second text block carrying the summary and records spam /
// keyword metadata on `Message.properties` (ContentBlock.Text has no metadata field). Produces a new
// Message rather than mutating in place. The model call degrades gracefully to an empty summary when
// Ollama is unreachable or a row fails (`tryPromise` captures the rejection so `orElse` can recover),
// so the suite stays green whenever the dataset is checked out — real summaries when Ollama is up, an
// empty-summary no-op otherwise.
const summarizeStage: Stage.Stage<Message.Message, Message.Message, Ctx, never> = Stage.map(
  'summarize',
  (message, ctx) =>
    Effect.gen(function* () {
      const text = Message.extractText(message);
      const result = yield* Effect.tryPromise(() => ctx.summarize(text)).pipe(
        Effect.orElse(() => Effect.succeed<Summary>({ summary: '', isSpam: false, keywords: [] })),
      );
      const summaryBlock: ContentBlock.Text = { _tag: 'text', text: result.summary };
      return Message.make({
        created: message.created,
        sender: message.sender,
        blocks: [...message.blocks, summaryBlock],
        properties: {
          ...message.properties,
          spam: result.isSpam,
          keywords: result.keywords,
        },
      });
    }),
);

// Stage 2: run the shared `contactExtractor` (the `@dxos/extractor` abstraction) to build a Person
// (+ Organization link by domain) from the sender, then persist the extractor's uncommitted output
// (normally the dispatcher's role). The extractor's `extract` has R = never, so it composes into
// `Pipeline.run` (which carries no requirements channel). Passes the Message through unchanged.
const extractStage: Stage.Stage<Message.Message, Message.Message, Ctx, never> = Stage.map(
  'extract-contact',
  (message, ctx) =>
    extractContact({ db: ctx.db, source: message }).pipe(
      Effect.map((result) => {
        for (const object of result.created) {
          ctx.db.add(object);
        }
        return message;
      }),
    ),
);

// Stage 3: pure-JS running tallies (no analysis libs — a Cloudflare-safe option would be a small
// pure-JS stats package, but none is added here). Mutates the context-carried accumulator and passes
// the Message through so it reaches the sink for collection.
const statsStage: Stage.Stage<Message.Message, Message.Message, Ctx, never> = Stage.map('stats', (message, ctx) =>
  Effect.sync(() => {
    const { stats } = ctx;
    stats.total += 1;
    const sender = message.sender.email;
    if (sender) {
      stats.from.set(sender, (stats.from.get(sender) ?? 0) + 1);
    }
    const recipients = message.properties?.to;
    if (Array.isArray(recipients)) {
      for (const recipient of recipients) {
        const address = String(recipient);
        stats.to.set(address, (stats.to.get(address) ?? 0) + 1);
      }
    }
    if (message.properties?.spam) {
      stats.spam += 1;
    }
    return message;
  }),
);

// Bookend logging stage: emits one line describing the message as it enters/leaves the pipeline and
// passes it through unchanged. (Visibility is controlled by LOG_FILTER, e.g. `LOG_FILTER=info`.)
// Logs only the sender domain, not the full address, to avoid recording PII.
const logStage = (label: string): Stage.Stage<Message.Message, Message.Message, Ctx, never> =>
  Stage.map(`log:${label}`, (message) =>
    Effect.sync(() => {
      const senderDomain = message.sender.email?.split('@')[1];
      log.info(label, {
        senderDomain,
        subject: message.properties?.subject,
        blocks: message.blocks.length,
        spam: message.properties?.spam,
      });
      return message;
    }),
  );

describe.skipIf(!HAS_DATASET)('Enron email pipeline (ROOT_DIR + Ollama gated)', () => {
  // Model layer built ONCE so it is not rebuilt per message. `AiService.model` provides the
  // `LanguageModel`, resolved through the local Ollama provider; `OllamaAiServiceLayer` provides the
  // `AiService` it requires.
  const modelLayer = AiService.model(MODEL, { provider: Provider.ollama.id }).pipe(Layer.provide(OllamaAiServiceLayer));
  const runtime = ManagedRuntime.make(modelLayer.pipe(Layer.orDie));

  let builder: EchoTestBuilder;
  let db: Database.Database;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Organization.Organization, Person.Person] }));
    // Seed a known Organization so domain-matching can link a sender's Person to it.
    for (const org of ORGS) {
      db.add(Obj.make(Organization.Organization, org));
    }
    await db.flush({ indexes: true });
  });

  afterAll(async () => {
    await runtime.dispose();
    await builder.close();
  });

  test(
    'summarizes, extracts contacts, and tallies stats over the first emails',
    async ({ expect }) => {
      const dataDir = join(ROOT_DIR, 'data');
      const files = (await readdir(dataDir))
        .filter((name) => /^train-.*\.parquet$/.test(name))
        .sort()
        .map((name) => join(dataDir, name));
      expect(files.length).toBeGreaterThan(0);

      const stats: Stats = { from: new Map(), to: new Map(), total: 0, spam: 0 };
      // `generateText` + lenient parse rather than `generateObject`: local reasoning models (gpt-oss
      // via Ollama) return valid JSON that fails strict schema conformance (→ MalformedOutput). The
      // cause is logged and degraded to an empty summary on failure, which also keeps the inner fiber
      // from raising a FiberFailure.
      const summarize = (text: string): Promise<Summary> =>
        runtime.runPromise(
          Effect.scoped(LanguageModel.generateText({ prompt: [SUMMARIZE_PROMPT, text].join('\n\n') })).pipe(
            Effect.map((response) => parseSummary(response.text)),
            Effect.catchAllCause((cause) =>
              Effect.sync(() => {
                log.warn('summarize failed; using empty summary', { model: MODEL, cause: Cause.pretty(cause) });
                return { summary: '', isSpam: false, keywords: [] } satisfies Summary;
              }),
            ),
          ),
        );

      const context: Ctx = { summarize, db, stats };

      const { sink, items } = captureSink<Message.Message>();
      await EffectEx.runPromise(
        Pipeline.run({
          source: parquetSource(files).pipe(Stream.take(EMAIL_COUNT), Stream.map(emailToMessage)),
          stages: [
            // Stages
            logStage('email.in'),
            summarizeStage,
            extractStage,
            statsStage,
            logStage('email.out'),
          ],
          sink,
          context,
        }),
      );

      // The pipeline processes up to EMAIL_COUNT messages (fewer only if the dataset is smaller).
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThanOrEqual(EMAIL_COUNT);

      for (const message of items) {
        const textBlocks = message.blocks.filter((block) => block._tag === 'text');
        // Original body block plus the appended summary block.
        expect(textBlocks.length).toBeGreaterThanOrEqual(2);
        expect(typeof message.properties?.spam).toBe('boolean');
        expect(Array.isArray(message.properties?.keywords)).toBe(true);
      }

      await db.flush({ indexes: true });
      const persons = await db.query(Filter.type(Person.Person)).run();
      expect(persons.length).toBeGreaterThan(0);

      expect(stats.total).toBe(items.length);
      expect(stats.from.size).toBeGreaterThan(0);
      expect(stats.to.size).toBeGreaterThan(0);

      // Serialize the run's outputs for inspection (git-ignored under ./data). `Obj.toJSON` is the
      // canonical ECHO serialization (encodes refs as DXNs).
      const organizations = await db.query(Filter.type(Organization.Organization)).run();
      await writeFile(
        RESULTS_FILE,
        JSON.stringify(
          {
            messages: items.map((message) => Obj.toJSON(message)),
            organizations: organizations.map((organization) => Obj.toJSON(organization)),
            persons: persons.map((person) => Obj.toJSON(person)),
            stats: {
              total: stats.total,
              spam: stats.spam,
              from: Object.fromEntries(stats.from),
              to: Object.fromEntries(stats.to),
            },
          },
          null,
          2,
        ),
      );
    },
    // The LLM call per message dominates; give the whole run a generous budget.
    5 * 60_000,
  );
});
