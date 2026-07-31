//
// Copyright 2026 DXOS.org
//

import { MODEL_POLICY } from './config';
import { ALL_VARIANTS, type ModelVariant } from './models';

// Declarative model routing (REPORT §5): one place that maps each per-message / per-corpus pipeline
// stage to the model it should run on, instead of hard-coding a `ModelVariant` at every call site.
// This is the PRODUCT / single-run path — one model per stage — and is orthogonal to the ladder bench
// (which deliberately runs every variant per task to compare them). Defaults are seeded from the §4
// ladder findings; each layer overrides the previous (default → per-run policy → MODEL_POLICY env).

/** The LLM-bearing pipeline stages. Deterministic stages (dedup, threading, stats) never appear here. */
export type StageId =
  | 'classify-sender'
  | 'tag'
  | 'summarize-message'
  | 'summarize-thread'
  | 'extract-facts'
  | 'draft'
  | 'summarize-topic';

/** A partial policy: stage → a `ModelVariant` name (substring), resolved to model DXN + provider + preset. */
export type ModelPolicy = Partial<Record<StageId, string>>;

/**
 * Defaults seeded from REPORT §4 (tested: labeling / summaries / drafts) and the §5 audit. Stages
 * §4 did not measure (classify-sender, extract-facts) default conservatively to haiku until their
 * own evals land. A variant NAME (not a raw DXN) so the provider/preset needed to actually run the
 * model come along for free.
 */
export const DEFAULT_MODEL_POLICY: Record<StageId, string> = {
  'classify-sender': 'claude-haiku', // Heuristic-first; haiku is the LLM fallback tier (eval landed; re-seed after a run).
  'tag': 'claude-haiku', // Open weak on labeling-agreement (§4).
  'summarize-message': 'claude-haiku', // gpt-oss-20b close, at a coverage discount.
  'summarize-thread': 'claude-haiku', // Cross-message synthesis is where open weights break (§4).
  'extract-facts': 'claude-haiku', // needs-eval → conservative.
  'draft': 'gemma-4-12b', // Clears the bar (§4); gpt-oss-20b for speed.
  'summarize-topic': 'gpt-oss-20b', // Cheap prose over a deterministic skeleton.
};

const KNOWN_STAGES = new Set<string>(Object.keys(DEFAULT_MODEL_POLICY));

/** Parses the `MODEL_POLICY` env (`stage=variant,stage=variant`); unknown stages are ignored. */
export const parseModelPolicyEnv = (raw = MODEL_POLICY): ModelPolicy => {
  const policy: ModelPolicy = {};
  for (const pair of (raw ?? '').split(',')) {
    const [stage, name] = pair.split('=').map((part) => part.trim());
    if (stage && name && KNOWN_STAGES.has(stage)) {
      policy[stage as StageId] = name;
    }
  }
  return policy;
};

/** The effective variant name for a stage: default ← per-run policy ← env (later wins). */
export const resolveModelName = (stage: StageId, policy?: ModelPolicy): string => {
  const merged = { ...DEFAULT_MODEL_POLICY, ...policy, ...parseModelPolicyEnv() };
  return merged[stage];
};

/**
 * Resolves the `ModelVariant` a stage should run on. The policy value is matched as a name substring
 * against `ALL_VARIANTS` (as `MODELS` does), so `haiku` → `claude-haiku`. Throws on an unknown name so
 * a typo'd override fails loudly rather than silently routing to the wrong (or no) model.
 */
export const resolveModel = (stage: StageId, policy?: ModelPolicy): ModelVariant => {
  const name = resolveModelName(stage, policy);
  const variant = ALL_VARIANTS.find((entry) => entry.name.includes(name));
  if (!variant) {
    throw new Error(`model-policy: no variant matches "${name}" for stage "${stage}"`);
  }
  return variant;
};
