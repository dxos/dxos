//
// Copyright 2026 DXOS.org
//

// Declarative model routing for the email pipeline stages (productized from the stories-brain research
// harness): one place that maps each LLM-bearing stage to the model it runs on, instead of hard-coding
// a model DXN at every call site. Product tiers only (Anthropic); the research ladder's open-weight
// (ollama) variants stay in the harness. Each layer overrides the previous: default ← per-run policy.

/** Anthropic model DXNs available to product pipelines. */
export const MODEL_HAIKU = 'com.anthropic.model.claude-haiku-4-5.default';
export const MODEL_SONNET = 'com.anthropic.model.claude-sonnet-4-6.default';
export const MODEL_OPUS = 'com.anthropic.model.claude-opus-4-8.default';

/** The LLM-bearing email pipeline stages. Deterministic stages (threading, dedup, stats) never appear. */
export type StageId =
  | 'classify-sender'
  | 'tag'
  | 'summarize-message'
  | 'summarize-thread'
  | 'summarize-topic'
  | 'extract-facts'
  | 'draft';

/** A partial policy: stage → a model DXN. */
export type ModelPolicy = Partial<Record<StageId, string>>;

/**
 * Default stage → model routing, seeded from the model-ladder findings (REPORT §4/§5): labeling and
 * summaries want a premier model, drafting tolerates a cheaper one. Product defaults to haiku across
 * the board (the cheapest premier tier); callers override per run via a `ModelPolicy`.
 */
export const DEFAULT_MODEL_POLICY: Record<StageId, string> = {
  'classify-sender': MODEL_HAIKU,
  'tag': MODEL_HAIKU,
  'summarize-message': MODEL_HAIKU,
  'summarize-thread': MODEL_HAIKU,
  'summarize-topic': MODEL_HAIKU,
  'extract-facts': MODEL_HAIKU,
  'draft': MODEL_HAIKU,
};

/** Resolves the model DXN for a stage: per-run `policy` wins over `DEFAULT_MODEL_POLICY`. */
export const resolveModel = (stage: StageId, policy?: ModelPolicy): string =>
  policy?.[stage] ?? DEFAULT_MODEL_POLICY[stage];
