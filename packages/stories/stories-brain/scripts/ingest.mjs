//
// Copyright 2026 DXOS.org
//

// Ingest the mailbox end-to-end: authenticate (once, front-loaded — approve in the browser, then walk
// away), sync the fixture from live Gmail, then extract facts — including questions and requests as
// directive facts (see illocutions in the pipeline-rdf DESIGN) — into the fact store. Stops there; use
// run-all.mjs for the full bench suite.
//
// Usage (from packages/stories/stories-brain):
//   MODELS=claude-sonnet node scripts/ingest.mjs     # pick the extractor model set
//   SKIP_FETCH=1 node scripts/ingest.mjs             # reuse the existing fixture (skip the sync)
//   FETCH_AFTER=2025-01-01 node scripts/ingest.mjs   # override the sync-back start
//
// Outputs: fixtures/local/mailbox-feed.json (feed) and fixtures/local/fact-store.json (facts).
// Prereqs: the OAuth client (.env.tpl / GOOGLE_CLIENT_ID+SECRET), Ollama for local models and/or
// DX_ANTHROPIC_API_KEY for remote. See google-auth.mjs and TEST-PLAN.md.

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAccessToken } from './google-auth.mjs';

const PACKAGE_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const run = (command, args) => spawnSync(command, args, { cwd: PACKAGE_ROOT, stdio: 'inherit', env: process.env });

// 1. Auth — front-load the browser consent so the sync + extraction run unattended.
console.error('===== auth — approve in the browser now; the rest runs unattended =====');
await getAccessToken();

// 2. Sync — live Gmail → fixtures/local/mailbox-feed.json (unless reusing the existing fixture).
if (!process.env.SKIP_FETCH) {
  console.error('\n===== sync (fetch-fixture) =====');
  const fetched = run('node', ['scripts/fetch-fixture.mjs']);
  if (fetched.status !== 0) {
    process.exit(fetched.status ?? 1);
  }
}

// 3. Extract facts + questions/requests → fixtures/local/fact-store.json.
console.error('\n===== extract facts / questions =====');
const facts = run('pnpm', ['exec', 'vitest', 'run', '--project=node', 'src/test/extract-facts.bench.test.ts']);
process.exit(facts.status ?? 1);
