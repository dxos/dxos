//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { AiUsage } from '@dxos/ai';
import { type Pipeline } from '@dxos/echo-memory';

/** The Discord pipeline's stages in the order it runs them; a stage only the trace names goes after these. */
const STAGES: ReadonlyArray<readonly [id: string, label: string]> = [
  ['crawl', 'Crawl'],
  ['topics', 'Topics'],
  ['extract-facts', 'Extract facts'],
];

/** The opening message of a thread is its title in a forum channel, so it names the source when nothing else does. */
const TITLE_LENGTH = 60;

type ModelCall = {
  readonly modelId?: string;
  readonly model: string;
  readonly stage?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cacheReadTokens?: number;
  readonly cacheWriteTokens?: number;
  readonly start?: number;
  readonly end?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const readCalls = (path: string): ModelCall[] =>
  readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .flatMap((line) => {
      const batch: unknown = JSON.parse(line);
      return isRecord(batch) && Array.isArray(batch.events) ? batch.events : [];
    })
    .flatMap((event: unknown) =>
      isRecord(event) && event.type === 'ai.modelCall' && isRecord(event.data) && typeof event.data.model === 'string'
        ? [{ ...event.data, model: event.data.model }]
        : [],
    );

const iso = (millis: number | undefined): string | undefined =>
  millis === undefined ? undefined : new Date(millis).toISOString();

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const number = (value: unknown): number => (typeof value === 'number' ? value : Number(value ?? 0));

/** Each stage's model usage, from the run's `ai.modelCall` events, priced at catalog prices. */
const stagesOf = (calls: readonly ModelCall[], crawled: number): Pipeline.Stage[] => {
  const ids = [...new Set([...STAGES.map(([id]) => id), ...calls.flatMap((call) => (call.stage ? [call.stage] : []))])];
  return ids.map((id, order) => {
    const own = calls.filter((call) => call.stage === id);
    const models = [...new Set(own.map((call) => call.modelId ?? call.model))].map((key) => {
      const ofModel = own.filter((call) => (call.modelId ?? call.model) === key);
      const tokens = {
        inputTokens: ofModel.reduce((sum, call) => sum + (call.inputTokens ?? 0), 0),
        outputTokens: ofModel.reduce((sum, call) => sum + (call.outputTokens ?? 0), 0),
        cacheReadTokens: ofModel.reduce((sum, call) => sum + (call.cacheReadTokens ?? 0), 0),
        cacheWriteTokens: ofModel.reduce((sum, call) => sum + (call.cacheWriteTokens ?? 0), 0),
      };
      const pricing = AiUsage.pricingOf(key);
      return {
        model: ofModel[0].model,
        calls: ofModel.length,
        ...tokens,
        ...(pricing ? { costUsd: AiUsage.cost(tokens, pricing) } : {}),
      };
    });
    const starts = own.flatMap((call) => (call.start !== undefined ? [call.start] : []));
    const ends = own.flatMap((call) => (call.end !== undefined ? [call.end] : []));
    return {
      id,
      label: STAGES.find(([stage]) => stage === id)?.[1] ?? id,
      order,
      ...(id === 'crawl' ? { items: crawled } : {}),
      ...(starts.length > 0 ? { startedAt: iso(Math.min(...starts)) } : {}),
      ...(ends.length > 0 ? { endedAt: iso(Math.max(...ends)) } : {}),
      models,
    };
  });
};

/**
 * The state of the crawl that wrote `factsPath`, read from the `crawl.db` and `trace.jsonl` beside it: every channel
 * with its cursor and first and last message, and each stage's model calls and cost. Undefined when the crawl's own
 * database is not there.
 */
export const pipelineState = (factsPath: string, facts: number): Pipeline.State | undefined => {
  const dir = dirname(factsPath);
  const crawlPath = join(dir, 'crawl.db');
  if (!existsSync(crawlPath)) {
    return undefined;
  }
  const db = new DatabaseSync(crawlPath);
  try {
    const sources: Pipeline.Source[] = db
      .prepare(
        `SELECT t.id AS id, t.cursor AS cursor, t.status AS status, COUNT(m.id) AS items,
           MIN(m.created_at) AS first, MAX(m.created_at) AS last,
           (SELECT text FROM message WHERE target_id = t.id ORDER BY created_at LIMIT 1) AS opener
         FROM crawl_target t LEFT JOIN message m ON m.target_id = t.id GROUP BY t.id`,
      )
      .all()
      .filter(isRecord)
      .map((row) => {
        const opener = text(row.opener)?.replace(/\s+/g, ' ').trim();
        return {
          id: String(row.id),
          ...(opener ? { label: opener.length > TITLE_LENGTH ? `${opener.slice(0, TITLE_LENGTH - 1)}…` : opener } : {}),
          ...(text(row.cursor) ? { cursor: text(row.cursor) } : {}),
          ...(text(row.first) ? { firstItemAt: new Date(String(row.first)).toISOString() } : {}),
          ...(text(row.last) ? { lastItemAt: new Date(String(row.last)).toISOString() } : {}),
          items: number(row.items),
          ...(text(row.status) ? { status: text(row.status) } : {}),
        };
      });
    const [run] = db.prepare('SELECT status FROM crawl_run').all().filter(isRecord);
    const tracePath = join(dir, 'trace.jsonl');
    const calls = existsSync(tracePath) ? readCalls(tracePath) : [];
    const starts = calls.flatMap((call) => (call.start !== undefined ? [call.start] : []));
    const ends = calls.flatMap((call) => (call.end !== undefined ? [call.end] : []));
    const crawled = sources.reduce((sum, source) => sum + source.items, 0);
    return {
      name: basename(dir),
      status: text(run?.status) ?? 'unknown',
      ...(starts.length > 0 ? { startedAt: iso(Math.min(...starts)) } : {}),
      ...(ends.length > 0 ? { endedAt: iso(Math.max(...ends)) } : {}),
      sources,
      stages: stagesOf(calls, crawled),
      facts,
    };
  } finally {
    db.close();
  }
};
