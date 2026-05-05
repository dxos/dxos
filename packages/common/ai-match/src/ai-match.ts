//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { log } from '@dxos/log';

import { type AiMatchConfig, type AiMatchResult, type MatchBase } from './types';

const MatchBaseSchema = Schema.Struct({
  sourceId: Schema.String,
  targetId: Schema.String,
  confidence: Schema.Literal('high', 'medium', 'low'),
  reasoning: Schema.String,
});
const MatchBaseArraySchema = Schema.Array(MatchBaseSchema);
const decodeMatches = Schema.decodeUnknownSync(MatchBaseArraySchema);

const DEFAULT_ENDPOINT = '/api/anthropic/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Use Claude to find semantic matches between two sets of objects.
 *
 * Generic over any two domains. The caller provides:
 * - Compact summarizers that render each object into a JSON-safe blob for the prompt
 * - Stable ID accessors so results can be re-joined to the original objects
 * - A plain-language `task` description of what "a match" means
 *
 * Returns an array of matches, each rejoined with the original source and target
 * objects. If a source item has no match, it is omitted from the results.
 *
 * The LLM is instructed to return strict JSON; responses wrapped in ``` fences
 * are stripped automatically. If the model returns malformed JSON, the error
 * is logged and an empty array is returned.
 */
export const aiMatch = async <S, T>(config: AiMatchConfig<S, T>): Promise<AiMatchResult<S, T>[]> => {
  const {
    source,
    target,
    summarizeSource,
    summarizeTarget,
    sourceId,
    targetId,
    task,
    apiKey,
    endpoint = DEFAULT_ENDPOINT,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    signal,
  } = config;

  if (!apiKey) {
    // Callers pass the API key explicitly — no localStorage fallback, since
    // that exposes a long-lived raw key to any XSS in the host app. In
    // Composer, the dev proxy injects a server-side key; in standalone
    // Node use, callers should resolve it via their own credential layer
    // (e.g. an Effect Config.redacted) before invoking aiMatch.
    throw new Error('aiMatch: `apiKey` is required');
  }
  if (source.length === 0 || target.length === 0) {
    return [];
  }

  const sourceById = new Map<string, S>();
  const sourceSummaries = source.map((item, index) => {
    const id = sourceId(item);
    if (sourceById.has(id)) {
      log.warn('aiMatch: duplicate source ID', { id });
    }
    sourceById.set(id, item);
    const summary = summarizeSource(item, index);
    const { _id: _dropped, ...rest } = summary as Record<string, unknown>;
    return { _id: id, ...rest };
  });

  const targetById = new Map<string, T>();
  const targetSummaries = target.map((item, index) => {
    const id = targetId(item);
    if (targetById.has(id)) {
      log.warn('aiMatch: duplicate target ID', { id });
    }
    targetById.set(id, item);
    const summary = summarizeTarget(item, index);
    const { _id: _dropped, ...rest } = summary as Record<string, unknown>;
    return { _id: id, ...rest };
  });

  const prompt = buildPrompt(task, sourceSummaries, targetSummaries);

  const response = await fetch(endpoint, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`aiMatch: Anthropic API ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as { content?: { text?: string }[] };
  const text = payload.content?.[0]?.text ?? '[]';
  const matches = parseJsonArray<MatchBase>(text);

  const joined: AiMatchResult<S, T>[] = [];
  for (const match of matches) {
    const sourceItem = sourceById.get(match.sourceId);
    const targetItem = targetById.get(match.targetId);
    if (!sourceItem || !targetItem) {
      log.info('aiMatch: dropping match with unknown id', { match });
      continue;
    }
    joined.push({ ...match, source: sourceItem, target: targetItem });
  }
  return joined;
};

const buildPrompt = (task: string, sources: unknown[], targets: unknown[]): string =>
  `${task}

SOURCE ITEMS:
${JSON.stringify(sources, null, 2)}

TARGET ITEMS:
${JSON.stringify(targets, null, 2)}

Return a JSON array of matches. Each match MUST have these fields:
- sourceId: the "_id" field from the source item (exact match)
- targetId: the "_id" field from the target item (exact match)
- confidence: "high", "medium", or "low"
- reasoning: one sentence explaining the connection

Only include matches with a real connection. Omit source items that have no matching target. Return ONLY the JSON array, no prose, no code fences.`;

const parseJsonArray = <T>(text: string): T[] => {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    const parsed = JSON.parse(stripped);
    // Schema-validate each element so malformed or partial model output
    // fails explicitly instead of handing the caller a half-typed cast.
    // Confidence is constrained to the three documented values.
    return decodeMatches(parsed) as readonly T[] as T[];
  } catch (err) {
    // Keep the text preview short — the model can echo prompt contents.
    log.warn('aiMatch: failed to parse/validate LLM response', { error: String(err), text: stripped.slice(0, 200) });
    return [];
  }
};
