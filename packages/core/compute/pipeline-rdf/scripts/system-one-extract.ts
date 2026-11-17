#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

/**
 * Probe: can System One models (non-generative) do the fact extraction `extract-facts.ts` does with an LLM?
 *
 * Per message:
 *   1. Clairic (extraction, spans only): a `list` field of claim clauses.
 *   2. Clairic, per claim: `subject` and `object` text fields, answered as spans of the claim.
 *   3. jev (decision), per claim: `predicate` as a choice over `Ontology.DEFAULT_ENTRIES` (+ `other`),
 *      `subject_entity` / `object_entity` as a choice over the known Discord users (+ `new`), and `is_fact` as a noul.
 * A predicate below `--min-confidence` (or `other`) is marked for the LLM fallback.
 *
 * Usage (from the repo root):
 *   bun packages/core/compute/pipeline-rdf/scripts/system-one-extract.ts [--dry-run] [--verbose]
 *     [--ids 123,456] [--max-cost 0.5] [--min-confidence 0.6] [--spans clairic|heuristic]
 *
 * Credentials (never printed): jev reads `TYPESAFE_API_KEY`, else `.secrets/typesafe.env`. Clairic reads
 * `CLAIRIC_ENDPOINT` (+ optional `CLAIRIC_API_KEY`), else `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`
 * (env or `.secrets/cloudflare.env`) for the Workers AI REST route. Without a jev key the run is a dry run;
 * without Clairic, spans come from a heuristic splitter so the jev stages can still be exercised.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Ontology from '../src/types/Ontology.ts';

//
// Config.
//

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const DATA_DIR = join(homedir(), '.local/share/dxos/discord');
const CRAWL_DB = join(DATA_DIR, 'crawl.db');
const FACTS_DB = join(DATA_DIR, 'facts.db');

const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const JEV_MODEL = 'jev-latest';
const CLAIRIC_MODEL = '@cf/cloudflare/clairic';

/** Published input prices, USD per million tokens; output is free on both. */
const PRICE = { jev: 0.042, clairic: 0.1 };

/** No local tokenizer; prose with JSON scaffolding tokenizes at roughly three characters a token. */
const CHARS_PER_TOKEN = 3;

/** Short-to-medium messages that `facts.db` already holds LLM facts for, so the two can be compared. */
const DEFAULT_IDS = [
  '1568261153329520711',
  '1562128886115074109',
  '1570500521146712105',
  '1564412597351092335',
  '1567216968476663991',
];

/** Used only when the crawl cache cannot be read. */
const FALLBACK_MESSAGES: Message[] = [
  {
    id: 'sample-1',
    authorId: '985848421195862056',
    author: 'Mykola',
    text: 'Making progress. I fixed the unit tests for the discord-composer setup and now I am optimizing our tools list.',
  },
  {
    id: 'sample-2',
    authorId: '332330209858813952',
    author: 'Josiah',
    text: '@Mykola what have you found wrt to the cloudflare bill?',
  },
  {
    id: 'sample-3',
    authorId: '242308925523755008',
    author: 'richburdon',
    text: 'Users create Agents via their Profile page; the Discord plugin maintains a DO connected to a Discord App.',
  },
  {
    id: 'sample-4',
    authorId: '389106806086959104',
    author: 'dmaretskyi',
    text: 'I shipped the RDF quad store yesterday. Josiah is working on the inbox triage demo.',
  },
  {
    id: 'sample-5',
    authorId: '1555777706459660288',
    author: 'kai',
    text: "I'm Kai, an agent working with the team. I keep track of what people are working on and take notes.",
  },
];

type Args = {
  dryRun: boolean;
  verbose: boolean;
  ids: string[];
  maxCost: number;
  minConfidence: number;
  spans?: 'clairic' | 'heuristic';
};

const parseArgs = (argv: string[]): Args => {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const spans = value('--spans');
  return {
    dryRun: argv.includes('--dry-run'),
    verbose: argv.includes('--verbose'),
    ids: value('--ids')?.split(',') ?? DEFAULT_IDS,
    maxCost: Number(value('--max-cost') ?? 0.5),
    minConfidence: Number(value('--min-confidence') ?? 0.6),
    spans: spans === 'clairic' || spans === 'heuristic' ? spans : undefined,
  };
};

//
// Credentials: values are read into memory and sent as headers, never logged.
//

const readEnvFile = (name: string): Record<string, string> => {
  const path = join(REPO_ROOT, '.secrets', name);
  if (!existsSync(path)) {
    return {};
  }
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .flatMap((match) => (match && match[2] ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [])),
  );
};

const credential = (name: string, file: string): string | undefined => process.env[name] || readEnvFile(file)[name];

type ClairicRoute = { url: string; token?: string; label: string };

const clairicRoute = (): ClairicRoute | undefined => {
  const endpoint = process.env.CLAIRIC_ENDPOINT;
  if (endpoint) {
    return { url: endpoint, token: process.env.CLAIRIC_API_KEY, label: 'CLAIRIC_ENDPOINT' };
  }
  const account = credential('CLOUDFLARE_ACCOUNT_ID', 'cloudflare.env');
  const token = credential('CLOUDFLARE_API_TOKEN', 'cloudflare.env');
  return account && token
    ? {
        url: `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${CLAIRIC_MODEL}`,
        token,
        label: 'Cloudflare Workers AI REST',
      }
    : undefined;
};

//
// Data.
//

type Message = { id: string; authorId: string; author: string; text: string };
type KnownEntity = { key: string; iri: string; label: string; username?: string };
type LlmFact = { s: string; p: string; o: string };

const sqliteJson = <T>(db: string, sql: string): T[] => {
  const out = execFileSync('sqlite3', ['-readonly', '-json', db, sql], { encoding: 'utf8' }).trim();
  return out ? (JSON.parse(out) as T[]) : [];
};

const userIri = (discordId: string) => `https://discord.com/users/${discordId}`;

const loadMessages = (ids: string[]): Message[] => {
  const safe = ids.filter((id) => /^\d+$/.test(id));
  try {
    const rows = sqliteJson<{ id: string; author_id: string; author_label: string; text: string }>(
      CRAWL_DB,
      `select id, author_id, author_label, text from message where id in (${safe.map((id) => `'${id}'`).join(',')})`,
    );
    if (rows.length > 0) {
      return rows.map((row) => ({ id: row.id, authorId: row.author_id, author: row.author_label, text: row.text }));
    }
  } catch (error) {
    console.warn(`crawl cache unreadable (${(error as Error).message.split('\n')[0]}); using hardcoded samples`);
  }
  return FALLBACK_MESSAGES;
};

const loadKnownEntities = (): KnownEntity[] => {
  try {
    const rows = sqliteJson<{ id: string; label: string; username: string | null }>(
      CRAWL_DB,
      `select a.id, a.label, (select value from agent_identifier where agent_id = a.id and namespace = 'discord-username') as username
       from agent a order by a.message_count desc`,
    );
    return rows.map((row) => {
      const discordId = row.id.replace(/^discord-user:/, '');
      return {
        key: `user_${discordId}`,
        iri: userIri(discordId),
        label: row.label,
        username: row.username ?? undefined,
      };
    });
  } catch {
    return FALLBACK_MESSAGES.map((message) => ({
      key: `user_${message.authorId}`,
      iri: userIri(message.authorId),
      label: message.author,
    }));
  }
};

/** The LLM extractor's facts for a message: every assertion in the graphs derived from `discord:<id>`. */
const loadLlmFacts = (messageId: string): LlmFact[] => {
  if (!/^\d+$/.test(messageId) || !existsSync(FACTS_DB)) {
    return [];
  }
  const label = 'http://www.w3.org/2000/01/rdf-schema#label';
  const type = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
  try {
    return sqliteJson<LlmFact>(
      FACTS_DB,
      `with g as (
         select q.s as gid from quads q join terms tp on tp.id = q.p join terms tob on tob.id = q.o
         where tp.lex = 'http://www.w3.org/ns/prov#wasDerivedFrom' and tob.lex = 'discord:${messageId}'),
       labels as (
         select q.s, q.g, t.lex from quads q join terms t on t.id = q.o
         where q.p = (select id from terms where lex = '${label}'))
       select coalesce(max(sl.lex), ts.lex) as s, tp.lex as p, coalesce(max(ol.lex), tob.lex) as o
       from quads q join g on q.g = g.gid
         join terms ts on ts.id = q.s join terms tp on tp.id = q.p join terms tob on tob.id = q.o
         left join labels sl on sl.s = q.s and sl.g = q.g
         left join labels ol on ol.s = q.o and ol.g = q.g
       where tp.lex not in ('${label}', '${type}')
       group by q.s, q.p, q.o, q.g`,
    );
  } catch {
    return [];
  }
};

//
// Requests.
//

type ClairicField = { type: 'text' } | { type: 'list'; items: 'text' };
type ClairicRequest = { model: string; state: string; fields: Record<string, ClairicField & { instructions: string }> };
type ClairicAnswer = {
  value: string | string[] | null;
  confidence?: number;
  p_null?: number;
  span?: [number, number];
  spans?: Array<[number, number]>;
};

type JevQuestion =
  | { type: 'noul'; instructions: string; criteria?: { true: string; false: string } }
  | { type: 'choice'; instructions: string; criteria: Record<string, string> };
type JevRequest = { model: string; state: unknown; questions: Record<string, JevQuestion> };
type JevAnswer =
  | { type: 'noul'; noul: number }
  | { type: 'choice'; choice: string; confidence: number; probabilities?: Record<string, number> };

const estimateTokens = (value: unknown) =>
  Math.ceil((typeof value === 'string' ? value : JSON.stringify(value)).length / CHARS_PER_TOKEN);

/** Clairic reads `state` once per `text` field and once more for all other fields together. */
const clairicPasses = (request: ClairicRequest) => {
  const types = Object.values(request.fields).map((field) => field.type);
  return types.filter((type) => type === 'text').length + (types.some((type) => type !== 'text') ? 1 : 0);
};

const estimateClairicTokens = (request: ClairicRequest) =>
  estimateTokens(request.state) * clairicPasses(request) + estimateTokens(request.fields);

const claimsRequest = (message: Message): ClairicRequest => ({
  model: CLAIRIC_MODEL,
  state: `${message.author}: ${message.text}`,
  fields: {
    claims: {
      type: 'list',
      items: 'text',
      instructions:
        'Each clause that states one fact, action, plan, request or question about a person, team, project or thing. One item per proposition; skip greetings and filler.',
    },
  },
});

const rolesRequest = (message: Message, claim: string): ClairicRequest => ({
  model: CLAIRIC_MODEL,
  state: `${message.author}: ${claim}`,
  fields: {
    subject: {
      type: 'text',
      instructions:
        'Who or what the clause is about: the actor, or the thing described. A first-person pronoun stands for the speaker before the colon.',
    },
    object: {
      type: 'text',
      instructions: 'What the subject acts on, has, asks about, or is related to.',
    },
  },
});

const PREDICATE_CRITERIA: Record<string, string> = {
  ...Object.fromEntries(
    Ontology.DEFAULT_ENTRIES.map((entry) => [
      entry.name,
      [
        `${entry.label}: ${entry.description ?? ''}`.trim(),
        entry.synonyms?.length ? `Also phrased: ${entry.synonyms.join(', ')}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    ]),
  ),
  other: 'None of the listed predicates states this relation.',
};

const entityCriteria = (known: KnownEntity[]): Record<string, string> => ({
  ...Object.fromEntries(
    known.map((entity) => [
      entity.key,
      `${entity.label}${entity.username && entity.username !== entity.label ? ` (Discord @${entity.username})` : ''}`,
    ]),
  ),
  new: 'Someone or something not in this list: a project, task, topic, thing, or a person not listed.',
});

type Roles = { claim: string; subject: string; object: string };

const decisionRequest = (message: Message, roles: Roles, known: KnownEntity[]): JevRequest => {
  const entities = entityCriteria(known);
  return {
    model: JEV_MODEL,
    state: {
      author: message.author,
      message: message.text,
      claim: roles.claim,
      subject: roles.subject,
      object: roles.object,
    },
    questions: {
      is_fact: {
        type: 'noul',
        instructions:
          'Does the claim state a fact, action, plan, request or question worth remembering about a person, team, project or thing?',
        criteria: { true: 'A proposition worth recording.', false: 'Filler, chit-chat, or a fragment.' },
      },
      predicate: {
        type: 'choice',
        instructions: `Which predicate best states the relation in the claim from the subject "${roles.subject}" to the object "${roles.object}"?`,
        criteria: PREDICATE_CRITERIA,
      },
      subject_entity: {
        type: 'choice',
        instructions: `Which entity is "${roles.subject}" in the claim? First-person words (I, me, my, we) refer to the author, ${message.author}.`,
        criteria: entities,
      },
      object_entity: {
        type: 'choice',
        instructions: `Which entity is "${roles.object}" in the claim? First-person words (I, me, my, we) refer to the author, ${message.author}.`,
        criteria: entities,
      },
    },
  };
};

//
// Heuristic spans: a stand-in for Clairic when it is unreachable, so the decision stages still run.
//

const PRONOUN = /^(i|we|you|he|she|they|it|i'm|i've|i'll|we're|we've)\b/i;

const heuristicClaims = (text: string): string[] =>
  text
    .split(/\n+|(?<=[.?!;])\s+/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*#>]+|\d+[.)])\s*/, '')
        .replace(/\*\*/g, '')
        .trim(),
    )
    .filter((line) => line.split(/\s+/).length >= 3)
    .slice(0, 8);

const heuristicRoles = (message: Message, claim: string): Roles => {
  const words = claim.replace(/^(@\S+\s*)+/, '').split(/\s+/);
  const [first, ...rest] = words;
  const subject = PRONOUN.test(first) || /^[A-Z@]/.test(first) ? first : message.author;
  const object = (subject === first ? rest.slice(1) : words).join(' ').slice(0, 80);
  return { claim, subject, object };
};

//
// HTTP.
//

type Usage = { calls: number; tokens: number; costUsd: number; latenciesMs: number[] };
const usage: Record<'jev' | 'clairic', Usage> = {
  jev: { calls: 0, tokens: 0, costUsd: 0, latenciesMs: [] },
  clairic: { calls: 0, tokens: 0, costUsd: 0, latenciesMs: [] },
};

const post = async (
  kind: 'jev' | 'clairic',
  url: string,
  token: string | undefined,
  body: unknown,
  estimate: number,
) => {
  const started = performance.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const elapsed = performance.now() - started;
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${kind} answered ${response.status}: ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as { result?: unknown; usage?: { input_tokens?: number } };
  // The Cloudflare REST route wraps the model's response in `result`.
  const payload = (json.result ?? json) as { answers: Record<string, unknown>; usage?: { input_tokens?: number } };
  const tokens = payload.usage?.input_tokens ?? estimate;
  usage[kind].calls++;
  usage[kind].tokens += tokens;
  usage[kind].costUsd += (tokens / 1_000_000) * PRICE[kind];
  usage[kind].latenciesMs.push(elapsed);
  return payload.answers;
};

//
// Run.
//

const pct = (value: number | undefined) => (value === undefined ? '  ? ' : `${Math.round(value * 100)}%`.padStart(4));

const topChoices = (answer: JevAnswer | undefined, count = 2): string => {
  if (!answer || answer.type !== 'choice') {
    return '?';
  }
  const probabilities = answer.probabilities ?? { [answer.choice]: answer.confidence };
  return Object.entries(probabilities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([key, value]) => `${key} ${pct(value).trim()}`)
    .join(', ');
};

const entityLabel = (choice: string, span: string, known: KnownEntity[]) => {
  const entity = known.find((candidate) => candidate.key === choice);
  return entity ? `${entity.label} <${entity.iri}>` : `"${span}" (new)`;
};

const printRequest = (title: string, body: unknown, verbose: boolean, first: boolean) => {
  if (verbose || first) {
    console.log(`  ${title}:\n${JSON.stringify(body, null, 2).replace(/^/gm, '    ')}`);
  } else {
    console.log(`  ${title}: ${JSON.stringify(body).length} chars`);
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const jevKey = credential('TYPESAFE_API_KEY', 'typesafe.env');
  const clairic = clairicRoute();
  const dryRun = args.dryRun || !jevKey;
  // A dry run shows the Clairic stages even without a route; a live run without one falls back to heuristics.
  const spans = args.spans ?? (clairic || dryRun ? 'clairic' : 'heuristic');

  console.log(`jev key: ${jevKey ? 'present' : 'absent'}; Clairic route: ${clairic ? clairic.label : 'absent'}`);
  console.log(`mode: ${dryRun ? 'dry run' : 'live'}; spans: ${spans}; max cost $${args.maxCost}\n`);
  if (spans === 'clairic' && !clairic && !dryRun) {
    throw new Error('--spans clairic needs CLAIRIC_ENDPOINT or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN');
  }

  const messages = loadMessages(args.ids);
  const known = loadKnownEntities();
  console.log(
    `${messages.length} messages, ${known.length} known entities, ${Ontology.DEFAULT_ENTRIES.length} predicates\n`,
  );

  let projected = 0;
  const shown = new Set<string>();
  const show = (title: string, body: unknown) => {
    printRequest(title, body, args.verbose, !shown.has(title));
    shown.add(title);
  };

  for (const message of messages) {
    console.log(`=== ${message.id} — ${message.author}\n${message.text.replace(/^/gm, '  | ')}\n`);

    // Stage 1: claims.
    let claims: string[];
    const claimsBody = claimsRequest(message);
    if (spans === 'clairic') {
      const tokens = estimateClairicTokens(claimsBody);
      projected += (tokens / 1_000_000) * PRICE.clairic;
      if (dryRun || !clairic) {
        show('clairic claims request', claimsBody);
        claims = heuristicClaims(message.text);
      } else {
        const answers = (await post('clairic', clairic.url, clairic.token, claimsBody, tokens)) as Record<
          string,
          ClairicAnswer
        >;
        const value = answers.claims?.value;
        claims = Array.isArray(value) ? value : [];
        console.log(`  clairic claims (conf ${pct(answers.claims?.confidence)}): ${JSON.stringify(claims)}`);
      }
    } else {
      claims = heuristicClaims(message.text);
    }

    // Stage 2: subject/object spans per claim.
    const roles: Roles[] = [];
    for (const claim of claims) {
      const rolesBody = rolesRequest(message, claim);
      if (spans === 'clairic') {
        const tokens = estimateClairicTokens(rolesBody);
        projected += (tokens / 1_000_000) * PRICE.clairic;
        if (dryRun || !clairic) {
          show('clairic roles request', rolesBody);
          roles.push(heuristicRoles(message, claim));
          continue;
        }
        const answers = (await post('clairic', clairic.url, clairic.token, rolesBody, tokens)) as Record<
          string,
          ClairicAnswer
        >;
        const subject = typeof answers.subject?.value === 'string' ? answers.subject.value : '';
        const object = typeof answers.object?.value === 'string' ? answers.object.value : '';
        if (subject && object) {
          roles.push({ claim, subject, object });
        } else {
          console.log(
            `  (no subject/object: s p_null ${pct(answers.subject?.p_null)}, o p_null ${pct(answers.object?.p_null)}) ${claim}`,
          );
        }
      } else {
        roles.push(heuristicRoles(message, claim));
      }
    }

    // Stage 3: decisions per claim.
    for (const role of roles) {
      const body = decisionRequest(message, role, known);
      const tokens = estimateTokens(body);
      projected += (tokens / 1_000_000) * PRICE.jev;
      if (dryRun) {
        show('jev decision request', body);
        continue;
      }
      if (usage.jev.costUsd + usage.clairic.costUsd + (tokens / 1_000_000) * PRICE.jev > args.maxCost) {
        console.log('  budget reached; stopping');
        break;
      }
      const answers = (await post('jev', JEV_ENDPOINT, jevKey, body, tokens)) as Record<string, JevAnswer>;
      const predicate = answers.predicate?.type === 'choice' ? answers.predicate : undefined;
      const subject = answers.subject_entity?.type === 'choice' ? answers.subject_entity : undefined;
      const object = answers.object_entity?.type === 'choice' ? answers.object_entity : undefined;
      const isFact = answers.is_fact?.type === 'noul' ? answers.is_fact.noul : undefined;
      const entry = Ontology.DEFAULT_ENTRIES.find((candidate) => candidate.name === predicate?.choice);
      const fallback = !predicate || predicate.choice === 'other' || predicate.confidence < args.minConfidence;
      console.log(
        [
          `  ${fallback ? '[LLM fallback] ' : ''}claim: ${role.claim}`,
          `    is_fact ${pct(isFact)}`,
          `    subject ${entityLabel(subject?.choice ?? 'new', role.subject, known)}   [${topChoices(subject)}]`,
          `    predicate ${entry ? `${entry.label} <${entry.iri}>` : predicate?.choice}   [${topChoices(predicate, 3)}]`,
          `    object ${entityLabel(object?.choice ?? 'new', role.object, known)}   [${topChoices(object)}]`,
        ].join('\n'),
      );
    }

    const llm = loadLlmFacts(message.id);
    if (llm.length > 0) {
      console.log(`\n  LLM extractor (facts.db), ${llm.length} statements:`);
      for (const fact of llm) {
        console.log(`    ${fact.s} —${fact.p.replace(/^.*[/#]/, '')}→ ${fact.o}`);
      }
    }
    console.log('');
  }

  console.log(`projected cost for this run: $${projected.toFixed(5)} (${CHARS_PER_TOKEN} chars/token estimate)`);
  for (const [kind, stats] of Object.entries(usage)) {
    if (stats.calls > 0) {
      const sorted = [...stats.latenciesMs].sort((a, b) => a - b);
      console.log(
        `${kind}: ${stats.calls} calls, ${stats.tokens} input tokens, $${stats.costUsd.toFixed(5)}, latency p50 ${Math.round(sorted[Math.floor(sorted.length / 2)])}ms max ${Math.round(sorted[sorted.length - 1])}ms`,
      );
    }
  }
};

await main();
