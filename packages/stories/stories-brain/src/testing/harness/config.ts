//
// Copyright 2026 DXOS.org
//

import { fileURLToPath } from 'node:url';

// Structural harness configuration: paths, corpus/output locations, and model routing that the
// harness infrastructure itself reads. (Non-structural, test-level knobs — subject, which model to
// save, skill modes — live in `src/test/defs.ts` next to the tests.)

/** Absolute package root (…/stories-brain/). Anchors fixture/result paths regardless of file depth. */
export const PACKAGE_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Node/browser-neutral POSIX path join (no `node:path`); collapses stray slashes between segments. */
export const join = (...parts: string[]): string =>
  parts
    .map((part, index) => (index === 0 ? part.replace(/\/+$/, '') : part.replace(/^\/+|\/+$/g, '')))
    .filter(Boolean)
    .join('/');

//
// Corpus / fixtures.
//

/** The private mailbox feed fixture (git-ignored). Override with `MAILBOX_FEED_FIXTURE`. */
export const FIXTURE = process.env.MAILBOX_FEED_FIXTURE ?? join(PACKAGE_ROOT, 'fixtures/local/mailbox-feed.json');

/** The persisted fact-store fixture. Override with `FACT_STORE_FIXTURE`. */
export const FACT_STORE_FIXTURE =
  process.env.FACT_STORE_FIXTURE ?? join(PACKAGE_ROOT, 'fixtures/local/fact-store.json');

/**
 * Human-reviewed ground-truth sender labels (person/org) for the classify-sender eval (git-ignored,
 * private). The bootstrap test writes a `.candidate.json` sibling; promote it to this path after
 * review. Override with `SENDER_LABELS`.
 */
export const SENDER_LABELS = process.env.SENDER_LABELS ?? join(PACKAGE_ROOT, 'fixtures/local/sender-labels.json');

/** Cap on messages, for fast iteration (`LIMIT=10`). Undefined → all messages. */
export const LIMIT = process.env.LIMIT ? Math.max(0, Number(process.env.LIMIT)) : undefined;

/**
 * In-flight parallelism for per-message fact extraction. Undefined → the bench picks a per-variant
 * default (parallel for network-bound remote models, serial for local ollama). `CONCURRENCY=n`
 * forces a fixed value for every variant.
 */
export const CONCURRENCY = process.env.CONCURRENCY ? Math.max(1, Number(process.env.CONCURRENCY)) : undefined;

//
// Results.
//

export const RESULTS_DIR = join(PACKAGE_ROOT, 'fixtures/local/results') + '/';

export const PROGRESS_PATH = join(RESULTS_DIR, 'progress.json');

/** Force a specific results path (single-result runs). */
export const RESULTS_OUT = process.env.RESULTS_OUT;

/** Max per-variant result rows written to JSON by benches. Undefined → all. */
export const SAMPLES = process.env.SAMPLES ? Number(process.env.SAMPLES) : undefined;

//
// Models / embeddings.
//

/** Model-variant filter (`local` | `remote` | comma-separated name substrings). */
export const MODELS = process.env.MODELS?.trim();

/** Ollama embedding model + endpoint for the vector index. */
export const EMBED_MODEL = process.env.EMBED_MODEL ?? 'nomic-embed-text';

export const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';
