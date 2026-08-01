//
// Copyright 2026 DXOS.org
//

// Unattended driver for the Active Topics experiment (spec 2026-07-13): over the private fixture,
// cluster + score topics, split active/suggested, fully populate the active ones, and write
// morning-review reports to fixtures/local/results/active-topics/. Fully non-interactive.
//
// Usage (from packages/stories/stories-brain):
//   moon run stories-brain:active-topics
//   ACTIVE_TOP=3 ACTIVE_THRESHOLD=0.7 moon run stories-brain:active-topics
//   MODEL_POLICY=draft=gpt-oss-20b moon run stories-brain:active-topics
//
// Prereqs: Ollama up with the ladder pulled (pipeline-email:pull-models); DX_ANTHROPIC_API_KEY set
// (haiku/opus for the LLM stages). Defaults below apply only when the var is unset (.env / shell win).

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));

// Seed process.env from a local `.env` (git-ignored) — shell env already set wins over the file.
const loadDotEnv = () => {
  const path = resolve(PACKAGE_ROOT, '.env');
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
};
loadDotEnv();

const DEFAULTS = {
  ACTIVE_N: '20', // Candidates scored by the LLM (highest activity first).
  ACTIVE_TOP: '5', // Fully-populated active topics.
  ACTIVE_THRESHOLD: '0.6', // Active/suggested confidence cutoff.
  LLM_TIMEOUT: '300', // Generous per-call timeout so slow local models finish.
  OLLAMA_MAX_LOADED_MODELS: '1', // Avoid VRAM thrash across stages.
};
for (const [key, value] of Object.entries(DEFAULTS)) {
  if (process.env[key] === undefined || process.env[key] === '') {
    process.env[key] = value;
  }
}

console.error('===== active-topics experiment =====');
console.error(
  `  candidates: ${process.env.ACTIVE_N}   active: ${process.env.ACTIVE_TOP}   threshold: ${process.env.ACTIVE_THRESHOLD}`,
);
console.error(`  policy:     ${process.env.MODEL_POLICY ?? '(default)'}`);
console.error('  reports →   fixtures/local/results/active-topics/{index,<topic>}.md + active-topics.json\n');

const result = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project=node', 'src/test/active-topics.bench.test.ts'], {
  stdio: 'inherit',
  cwd: PACKAGE_ROOT,
  env: process.env,
});
process.exit(result.status ?? 1);
