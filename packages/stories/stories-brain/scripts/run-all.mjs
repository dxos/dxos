//
// Copyright 2026 DXOS.org
//

// One-shot unattended research run. The only interactive step (the Google OAuth consent) is
// front-loaded, so once you approve it in the browser you can walk away: it then regenerates the
// mailbox fixture from live Gmail and runs every pipeline bench sequentially, each writing its stats
// to fixtures/local/results (JSON + .md; progress in progress.json; analyze-results at the end).
//
// Always runs the FULL corpus — `LIMIT` is cleared so a stray cap never truncates the canonical run.
//
// Usage (from packages/stories/stories-brain):
//   MODELS=qwen node scripts/run-all.mjs                        # narrow the model set
//   SKIP_FETCH=1 node scripts/run-all.mjs                       # reuse the existing fixture (no re-fetch)
//   TESTS=tags,draft-responses node scripts/run-all.mjs         # run a subset of benches
//
// Prereqs: the OAuth client (.env.tpl / GOOGLE_CLIENT_ID+SECRET), Ollama running for local models,
// and DX_ANTHROPIC_API_KEY for the remote tier. See google-auth.mjs and TESTPLAN.md.

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAccessToken } from './google-auth.mjs';

const PACKAGE_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));

// The canonical run covers the whole fixture — never a capped subset — so drop any inherited LIMIT.
delete process.env.LIMIT;

const run = (script) => spawnSync('node', [script], { cwd: PACKAGE_ROOT, stdio: 'inherit', env: process.env });

// 1. Front-load the browser consent so everything after it is unattended (subsequent auth reuses the
//    saved refresh token — no further prompts).
console.error('===== auth — approve in the browser now; the rest runs unattended =====');
await getAccessToken();

// 2. Regenerate the fixture from live Gmail (unless reusing the existing one).
if (!process.env.SKIP_FETCH) {
  console.error('\n===== fetch-fixture =====');
  const fetched = run('scripts/fetch-fixture.mjs');
  if (fetched.status !== 0) {
    process.exit(fetched.status ?? 1);
  }
}

// 3. Run every bench sequentially; each writes its stats to fixtures/local/results.
console.error('\n===== run-suite (all pipelines) =====');
const suite = run('scripts/run-suite.mjs');
process.exit(suite.status ?? 1);
