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

/** Default message count for the intentionally-small html-vs-text benchmark. */
export const DEFAULT_HTML_VS_TEXT_N = 10;

/** Optional user instructions steering the draft-responses benchmark (a proxy for the Mailbox Instructions object). */
export const DRAFT_INSTRUCTIONS = process.env.DRAFT_INSTRUCTIONS?.trim();

/** Preferred subject when none is given and it is present in the fact store. */
export const DEFAULT_SUBJECT = 'Nicole Gudmand';
