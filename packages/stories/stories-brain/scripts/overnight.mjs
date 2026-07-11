//
// Copyright 2026 DXOS.org
//

// Unattended overnight driver for the model-ladder experiment: runs the graded task sweep (labeling,
// summaries, drafts) across the open-weight ladder + haiku (the bar), scored by the opus judge, with
// the live stats table in the foreground and vitest logs teed to results/bench.log. Fully
// non-interactive — set it running and read `fixtures/local/results/model-ladder.md` in the morning.
//
// Usage (from packages/stories/stories-brain):
//   moon run stories-brain:overnight
//   LADDER_N=40 moon run stories-brain:overnight            # more messages (more signal, more cost)
//   LADDER_TASKS=labeling,drafts moon run stories-brain:overnight
//
// Prereqs: Ollama up with the ladder pulled (pipeline-email:pull-models); DX_ANTHROPIC_API_KEY set
// (haiku contestant + opus judge). Defaults below apply only when the var is unset (.env / shell win).

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));

// Contestants = 5 open-weight tiers + haiku (the bar); grader = opus (never a contestant).
const DEFAULTS = {
  MODELS: 'llama-3.2-3b,qwen3-8b,gemma-4-12b,gpt-oss-20b,qwen3-30b,claude-haiku',
  JUDGE: 'claude-opus',
  LADDER_REFERENCE: 'haiku',
  LADDER_N: '25',
  // Generous per-call timeout so slow reasoning / 30B models FINISH (a timeout would score as
  // inaccurate); latency is measured separately, so slowness is captured, not penalized as failure.
  LLM_TIMEOUT: '300',
  // One resident model at a time: the ladder runs model-by-model, so this avoids VRAM contention /
  // reload thrash and keeps per-item latency clean. The opus judge is remote (no local footprint).
  OLLAMA_MAX_LOADED_MODELS: '1',
};
for (const [key, value] of Object.entries(DEFAULTS)) {
  if (process.env[key] === undefined || process.env[key] === '') {
    process.env[key] = value;
  }
}

console.error('===== overnight model-ladder + artifacts =====');
console.error(`  models:    ${process.env.MODELS}`);
console.error(`  judge:     ${process.env.JUDGE}   reference: ${process.env.LADDER_REFERENCE}`);
console.error(
  `  messages:  graded ${process.env.LADDER_N} / artifacts ${process.env.ARTIFACT_N ?? 300}   tasks: ${process.env.LADDER_TASKS ?? 'labeling,summarize-messages,summarize-threads,drafts'}`,
);
console.error('  reports →  fixtures/local/results/{model-ladder,topics,profiles,drafts-sample}.md\n');

// Reuse bench.mjs: it loads .env, seeds progress.json, and tees vitest logs. Render the live stats
// table only on a TTY; a detached/background run logs plainly (no alt-screen redraw into a file).
const stats = process.stdout.isTTY ? ['--stats'] : [];
const result = spawnSync('node', ['scripts/bench.mjs', '--tests', 'model-ladder,artifacts', ...stats], {
  cwd: PACKAGE_ROOT,
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
