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

//
// Sender-type triage (classify-sender ground-truth eval).
//

/** Model used to bootstrap the candidate sender-label gold set (a name substring; strongest by default). */
export const SENDER_LABEL_MODEL = process.env.SENDER_LABEL_MODEL?.trim() ?? 'opus';

/** Confidence at/above which the hybrid arm trusts the heuristic instead of calling the model. */
export const SENDER_HYBRID_THRESHOLD = process.env.SENDER_HYBRID_THRESHOLD
  ? Number(process.env.SENDER_HYBRID_THRESHOLD)
  : 0.9;

//
// Qualitative artifacts (topics / profiles / sample drafts) — a wider corpus slice, single model.
//

/** Messages drawn for the artifact pass (wider than the graded LADDER_N so topics/profiles aren't thin). */
export const ARTIFACT_N = process.env.ARTIFACT_N ? Math.max(1, Number(process.env.ARTIFACT_N)) : 300;

/** Canonical model for the topic + profile artifacts (a name substring; the bar by default). */
export const ARTIFACT_MODEL = process.env.ARTIFACT_MODEL?.trim() ?? 'haiku';

/** Open-weight model shown beside the bar in the sample drafts (a name substring). */
export const ARTIFACT_BEST_OPEN = process.env.ARTIFACT_BEST_OPEN?.trim() ?? 'gpt-oss-20b';

/** How many contact profiles to write. */
export const ARTIFACT_PROFILES = process.env.ARTIFACT_PROFILES ? Math.max(1, Number(process.env.ARTIFACT_PROFILES)) : 3;

/** How many sample drafts to write. */
export const ARTIFACT_DRAFTS = process.env.ARTIFACT_DRAFTS ? Math.max(1, Number(process.env.ARTIFACT_DRAFTS)) : 10;

/** Cap on threads fed to the topic-clustering prompt (keeps it inside context). */
export const ARTIFACT_THREAD_CAP = process.env.ARTIFACT_THREAD_CAP
  ? Math.max(1, Number(process.env.ARTIFACT_THREAD_CAP))
  : 60;

/** Owner/self entity slugs excluded from profile subject selection. */
export const ARTIFACT_OWNER = (process.env.ARTIFACT_OWNER ?? 'rich-burdon,recipient').split(',').map((s) => s.trim());

/** Mailbox owner email — steers `buildThreads` thread-state inference (awaiting-mine vs theirs). */
export const ARTIFACT_OWNER_EMAIL = process.env.ARTIFACT_OWNER_EMAIL?.trim() ?? 'rich@braneframe.com';

/** Disable the LLM-judge scoring pass (`EVAL_SCORE=0`) to run the cheap response-only eval. */
export const EVAL_SCORE = process.env.EVAL_SCORE !== '0';

/** Default message count for the intentionally-small html-vs-text benchmark. */
export const DEFAULT_HTML_VS_TEXT_N = 10;

/**
 * Overrides the reply-style instructions for the draft-responses benchmark (a proxy for the Mailbox
 * Instructions object). Unset → the pipeline's `DEFAULT_DRAFT_INSTRUCTIONS` (plain/direct/no hedging);
 * set to empty to draft with the base rules only.
 */
export const DRAFT_INSTRUCTIONS = process.env.DRAFT_INSTRUCTIONS?.trim();

/** Preferred subject when none is given and it is present in the fact store. */
export const DEFAULT_SUBJECT = 'Nicole Gudmand';
