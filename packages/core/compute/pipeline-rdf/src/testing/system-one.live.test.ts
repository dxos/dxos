//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { DirectAiServiceLayer } from '@dxos/ai/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';

import { DEFAULT_MODEL } from '../internal/stages/extract.ts';
import { type SystemOneReport, extractSystemOneDocFacts } from '../stages/index.ts';
import { type ExtractDocument, type Fact, type KnownEntity } from '../types/index.ts';
import { readCredential, workersAiSystemOneService } from './workers-ai.ts';

// Live System One extraction against Cloudflare Workers AI, with Claude Haiku as the fallback. Skipped unless the
// credentials are in the environment or in `.secrets/` at the repo root:
//   moon run pipeline-rdf:test -- src/testing/system-one.live.test.ts
// SYSTEM_ONE_COMPARE=1 also runs ~10 crawled Discord messages and compares them with the LLM's facts (both databases
// are opened read-only).

const SECRETS = fileURLToPath(new URL('../../../../../../.secrets/', import.meta.url));
const FILES = ['cloudflare.env', 'discord.env', 'anthropic.env'].map((name) => join(SECRETS, name));

const ACCOUNT_ID = readCredential('CLOUDFLARE_ACCOUNT_ID', FILES);
const API_TOKEN = readCredential('CLOUDFLARE_API_TOKEN', FILES);
const ANTHROPIC_KEY = readCredential('DX_ANTHROPIC_API_KEY', FILES);
const ENABLED = !!(ACCOUNT_ID && API_TOKEN && ANTHROPIC_KEY);

if (ENABLED && !process.env.DX_ANTHROPIC_API_KEY && ANTHROPIC_KEY) {
  // DirectAiServiceLayer reads the key from the environment when it is built.
  process.env.DX_ANTHROPIC_API_KEY = ANTHROPIC_KEY;
}

const layer = () =>
  workersAiSystemOneService(
    { accountId: ACCOUNT_ID ?? '', apiToken: Redacted.make(API_TOKEN ?? '') },
    DirectAiServiceLayer,
  );

/** Input prices in USD per million tokens (output is free); Clef has no price in the repo, so Clairic's stands in. */
const PRICE = { clairic: 0.1, clef: 0.1, haikuIn: 1, haikuOut: 5 };

/** A fallback request: the rule prompt plus the clauses, and the JSON facts it writes, at Haiku's rates. */
const FALLBACK_COST = (4_000 * PRICE.haikuIn + 400 * PRICE.haikuOut) / 1_000_000;

const costOf = (report: SystemOneReport) =>
  (report.extractionTokens * PRICE.clairic + report.decisionTokens * PRICE.clef) / 1_000_000 +
  report.fallbackCalls * FALLBACK_COST;

describe.skipIf(!ENABLED)('System One extraction (live, Workers AI)', () => {
  test('extracts facts from a short message', async ({ expect }) => {
    const doc: ExtractDocument = {
      text: 'I shipped the RDF quad store yesterday. Josiah is working on the inbox triage demo.',
      source: 'live:1',
      author: 'dmaretskyi',
    };
    const entities: KnownEntity[] = [
      { iri: 'https://discord.com/users/1', label: 'dmaretskyi', type: 'person' },
      { iri: 'https://discord.com/users/2', label: 'Josiah', type: 'person' },
    ];
    const { facts, report } = await EffectEx.runPromise(
      extractSystemOneDocFacts(doc, { extractor: 'system-one', entities }).pipe(Effect.provide(layer())),
    );
    log.info('system-one live', { report, facts: facts.map(({ assertion }) => assertion) });
    expect(report.claims).toBeGreaterThan(0);
    expect(facts.length).toBeGreaterThan(0);
  }, 120_000);

  test.skipIf(!process.env.SYSTEM_ONE_COMPARE)(
    'compares with the LLM facts on crawled messages',
    async ({ expect }) => {
      const dir = join(homedir(), '.local/share/dxos/discord');
      const crawl = join(dir, 'crawl.db');
      const factsDb = existsSync(join(dir, 'facts.db')) ? join(dir, 'facts.db') : undefined;
      const entities = loadEntities(crawl);
      const messages = loadMessages(crawl, factsDb, Number(process.env.SYSTEM_ONE_LIMIT ?? 10));
      const maxCost = Number(process.env.SYSTEM_ONE_MAX_COST ?? 0.5);

      let spent = 0;
      const rows: Array<{ id: string; report: SystemOneReport; facts: Fact[]; llm: LlmFact[] }> = [];
      for (const message of messages) {
        if (spent > maxCost) {
          log.warn('system-one compare: budget reached', { spent });
          break;
        }
        const { facts, report } = await EffectEx.runPromise(
          extractSystemOneDocFacts(
            { text: message.text, source: `discord:${message.id}`, author: message.author },
            { extractor: 'system-one', entities },
          ).pipe(Effect.provide(layer())),
        );
        spent += costOf(report);
        rows.push({ id: message.id, report, facts, llm: factsDb ? loadLlmFacts(factsDb, message.id) : [] });
      }

      const total = (key: 'claims' | 'accepted' | 'dropped' | 'fallbackClaims' | 'fallbackCalls') =>
        rows.reduce((sum, { report }) => sum + report[key], 0);
      const latencies = rows.map(({ report }) => report.systemOneMs + report.fallbackMs).sort((a, b) => a - b);
      const summary = {
        messages: rows.length,
        claims: total('claims'),
        accepted: total('accepted'),
        dropped: total('dropped'),
        fallbackClaims: total('fallbackClaims'),
        fallbackCalls: total('fallbackCalls'),
        messagesWithoutFallback: rows.filter(({ report }) => report.fallbackCalls === 0).length,
        latencyP50Ms: latencies[Math.floor(latencies.length / 2)],
        latencyMaxMs: latencies.at(-1),
        systemOneMsP50: rows.map(({ report }) => report.systemOneMs).sort((a, b) => a - b)[Math.floor(rows.length / 2)],
        costUsd: Number(spent.toFixed(5)),
        fallbackModel: DEFAULT_MODEL,
      };
      for (const { id, report, facts, llm } of rows) {
        log.info('system-one compare: message', {
          id,
          reasons: report.reasons,
          systemOne: facts.map(
            ({ extractor, assertion }) =>
              `[${extractor.id}] ${assertion.subject.kind === 'entity' ? assertion.subject.label : ''} —${assertion.predicate}→ ${assertion.object.kind === 'entity' ? assertion.object.label : ''}`,
          ),
          llm: llm.map(({ s, p, o }) => `${s} —${p.replace(/^.*[/#]/, '')}→ ${o}`),
        });
      }
      log.info('system-one compare: summary', summary);
      expect(rows.length).toBeGreaterThan(0);
    },
    600_000,
  );
});

/** Rows of a query run by the `sqlite3` CLI with `-readonly`, so neither database can be written. */
const query = <A>(db: string, schema: Schema.Codec<A>, sql: string): A[] => {
  const out = execFileSync('sqlite3', ['-readonly', '-json', db, sql], { encoding: 'utf8' }).trim();
  return out ? Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Array(schema)))(out).slice() : [];
};

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

type LlmFact = { readonly s: string; readonly p: string; readonly o: string };
const LlmFact = Schema.Struct({ s: Schema.String, p: Schema.String, o: Schema.String });
const Message = Schema.Struct({ id: Schema.String, author: Schema.String, text: Schema.String });
const Agent = Schema.Struct({ id: Schema.String, label: Schema.NullOr(Schema.String) });

const loadEntities = (db: string): KnownEntity[] =>
  query(db, Agent, 'select id, label from agent order by message_count desc').flatMap(({ id, label }) =>
    label
      ? [{ iri: `https://discord.com/users/${id.replace(/^discord-user:/, '')}`, label, type: 'person' as const }]
      : [],
  );

/** Short-to-medium messages that the LLM extractor already produced facts for, so the two can be compared. */
const loadMessages = (crawl: string, facts: string | undefined, limit: number) =>
  query(
    crawl,
    Message,
    `select id, coalesce(author_label, author_id) as author, text from message
     where length(text) between 60 and 700 order by created_at desc`,
  )
    .filter(({ id }) => !facts || loadLlmFacts(facts, id).length > 0)
    .slice(0, limit);

const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

/** The LLM extractor's statements for a message: every assertion in the graphs derived from `discord:<id>`. */
const loadLlmFacts = (db: string, id: string): LlmFact[] =>
  query(
    db,
    LlmFact,
    `with g as (
       select q.s as gid from quads q join terms tp on tp.id = q.p join terms tob on tob.id = q.o
       where tp.lex = 'http://www.w3.org/ns/prov#wasDerivedFrom' and tob.lex = ${quote(`discord:${id}`)}),
     labels as (
       select q.s, q.g, t.lex from quads q join terms t on t.id = q.o
       where q.p = (select id from terms where lex = ${quote(RDFS_LABEL)}))
     select coalesce(max(sl.lex), ts.lex) as s, tp.lex as p, coalesce(max(ol.lex), tob.lex) as o
     from quads q join g on q.g = g.gid
       join terms ts on ts.id = q.s join terms tp on tp.id = q.p join terms tob on tob.id = q.o
       left join labels sl on sl.s = q.s and sl.g = q.g
       left join labels ol on ol.s = q.o and ol.g = q.g
     where tp.lex not in (${quote(RDFS_LABEL)}, ${quote(RDF_TYPE)})
     group by q.s, q.p, q.o, q.g`,
  );
