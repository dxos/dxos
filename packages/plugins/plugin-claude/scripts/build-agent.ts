#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

// Builds the Claude Code agent the desktop app's agent helper runs: the ACP adapter for the Claude
// Agent SDK, bundled into one file beside its `agent.json`, at `dist/agent/claude-code/`.
//
// The adapter is installed without optional dependencies, which skips the SDK's own native `claude`
// binary (hundreds of MB per platform): the helper points the adapter at the user's installed
// `claude` instead.

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The adapter version the app ships; bump deliberately, it pins the Claude Agent SDK too. */
const ADAPTER = '@agentclientprotocol/claude-agent-acp@0.85.0';
const AGENT_ID = 'claude-code';
const ENTRY = 'claude-agent-acp.js';
const OUTDIR = join('dist', 'agent', AGENT_ID);

const workdir = await mkdtemp(join(tmpdir(), 'claude-agent-'));
try {
  await writeFile(join(workdir, 'package.json'), JSON.stringify({ name: 'claude-agent-build', private: true }));
  const install = Bun.spawnSync(['bun', 'add', '--omit', 'optional', ADAPTER], { cwd: workdir, stderr: 'inherit' });
  if (install.exitCode !== 0) {
    throw new Error(`installing ${ADAPTER} failed`);
  }

  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });
  const result = await Bun.build({
    entrypoints: [join(workdir, 'node_modules/@agentclientprotocol/claude-agent-acp/dist/index.js')],
    target: 'bun',
    naming: ENTRY,
    outdir: OUTDIR,
  });
  if (!result.success) {
    console.error('[build-agent] failed:', result.logs);
    process.exit(1);
  }

  await writeFile(
    join(OUTDIR, 'agent.json'),
    `${JSON.stringify(
      {
        id: AGENT_ID,
        entry: ENTRY,
        executable: { name: 'claude', versionArgs: ['--version'], env: 'CLAUDE_CODE_EXECUTABLE' },
      },
      null,
      2,
    )}\n`,
  );
  console.log(`[build-agent] ${OUTDIR}`);
} finally {
  await rm(workdir, { recursive: true, force: true });
}
