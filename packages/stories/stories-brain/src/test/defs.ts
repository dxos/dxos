//
// Copyright 2026 DXOS.org
//

// Non-structural test knobs: which subject / model / skill modes a test uses. Env-overridable
// defaults, kept next to the tests (structural harness config lives in testing/harness/config.ts).

/** Local model for the single-model feed-facts test (model DXN; camelCase final segment). */
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'com.openai.model.gpt-oss-20b.default';

/** Which variant's fact set extract-facts persists as the fixture (falls back to the largest). */
export const FACT_STORE_MODEL = process.env.FACT_STORE_MODEL ?? 'claude-sonnet';

/** Explicit subject override for subject-facts / the brain-vs-rag eval. */
export const SUBJECT = process.env.SUBJECT;

/** Skill-mode filter for the brain-vs-rag eval (comma-separated). */
export const SKILL_MODES = process.env.SKILL_MODES?.trim();

/** Grading model for the brain-vs-rag eval (name substring); a fixed strong judge applied to every arm. */
export const JUDGE = process.env.JUDGE?.trim();

/** Message cap for the model-ladder bench (kept small — every message is graded across every model). */
export const LADDER_N = process.env.LADDER_N ? Math.max(1, Number(process.env.LADDER_N)) : 25;

/** Which ladder tasks to run (comma-separated: labeling, summarize-messages, summarize-threads, drafts). */
export const LADDER_TASKS = process.env.LADDER_TASKS?.trim();

/** Reference model the labeling task is scored against (the "bar"); a name substring. */
export const LADDER_REFERENCE = process.env.LADDER_REFERENCE?.trim() ?? 'haiku';

/** Accuracy tolerance: the smallest model within this fraction of the reference is "sufficient". */
export const LADDER_TOLERANCE = process.env.LADDER_TOLERANCE ? Number(process.env.LADDER_TOLERANCE) : 0.95;

/** Disable the LLM-judge scoring pass (`EVAL_SCORE=0`) to run the cheap response-only eval. */
export const EVAL_SCORE = process.env.EVAL_SCORE !== '0';

/** Default message count for the intentionally-small html-vs-text benchmark. */
export const DEFAULT_HTML_VS_TEXT_N = 10;

/** Optional user instructions steering the draft-responses benchmark (a proxy for the Mailbox Instructions object). */
export const DRAFT_INSTRUCTIONS = process.env.DRAFT_INSTRUCTIONS?.trim();

/** Preferred subject when none is given and it is present in the fact store. */
export const DEFAULT_SUBJECT = 'Nicole Gudmand';
