//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { type AiMatchConfig, type AiMatchResult, type MatchBase } from './types';

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
    apiKey = resolveApiKey(),
    endpoint = DEFAULT_ENDPOINT,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    signal,
  } = config;

  if (!apiKey) {
    throw new Error('aiMatch: no Anthropic API key. Pass `apiKey` or set `ANTHROPIC_API_KEY` in localStorage.');
  }
  if (source.length === 0 || target.length === 0) {
    return [];
  }

  const sourceById = new Map<string, S>();
  const sourceSummaries = source.map((item, index) => {
    const id = sourceId(item);
    sourceById.set(id, item);
    return { _id: id, ...summarizeSource(item, index) };
  });

  const targetById = new Map<string, T>();
  const targetSummaries = target.map((item, index) => {
    const id = targetId(item);
    targetById.set(id, item);
    return { _id: id, ...summarizeTarget(item, index) };
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

const resolveApiKey = (): string | undefined => {
  if (typeof globalThis.localStorage !== 'undefined') {
    return globalThis.localStorage.getItem('ANTHROPIC_API_KEY') ?? undefined;
  }
  return undefined;
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
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (err) {
    log.warn('aiMatch: failed to parse LLM response as JSON', { error: String(err), text: stripped.slice(0, 200) });
    return [];
  }
};
