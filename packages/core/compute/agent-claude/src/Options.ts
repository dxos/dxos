//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { Options as SdkOptions } from '@anthropic-ai/claude-agent-sdk';

/**
 * Tools auto-approved without reaching a permission prompt. Read-only by construction: the host has
 * no approval surface yet, so anything that mutates the working tree stays out.
 */
export const READ_ONLY_TOOLS: readonly string[] = ['Read', 'Grep', 'Glob'];

/**
 * Scoped deny rules, which apply in every permission mode including `bypassPermissions` — so they
 * survive a later loosening of {@link make}'s defaults.
 */
export const DENY_RULES: readonly string[] = ['Bash(rm *)', 'Bash(git push *)', 'Bash(git reset *)'];

/** Bounds a runaway loop, since nothing is watching an unattended sidecar turn. */
export const DEFAULT_MAX_TURNS = 32;

export type MakeOptions = {
  /** Working directory the agent is scoped to; one per conversation. */
  cwd: string;
  maxTurns?: number;
  model?: string;
  /** SDK session to continue, so a turn sees the conversation's earlier history. */
  resume?: string;
  /** With {@link MakeOptions.resume}, branch into a new session id instead of continuing. */
  forkSession?: boolean;
};

/**
 * Builds the SDK options for a host turn.
 *
 * `dontAsk` denies anything that would otherwise prompt, which is what makes a host with no
 * approval UI safe to run unattended — the alternative modes either block forever waiting on a
 * prompt nobody can answer (`default`) or hand an unwatched process write access
 * (`acceptEdits`, `bypassPermissions`). Denied calls are still reported, so a real permission
 * surface can be designed from what actual workloads asked for rather than from guesswork.
 *
 * `settingSources: []` keeps the host from inheriting the developer's own `~/.claude` settings,
 * whose hooks would otherwise fire inside this nested agent.
 */
/**
 * The SDK scopes tool execution to `cwd` but never tells the agent about it — left alone it assumes
 * the repository root, builds absolute paths from there, and burns a failed tool call per turn
 * before the error message reveals the real directory.
 */
const workingDirectoryPreamble = (cwd: string) =>
  [
    `Your working directory is ${cwd}.`,
    'Tools require absolute paths; resolve any relative path the user gives you against that',
    'directory rather than the repository root.',
  ].join(' ');

export const make = ({ cwd, maxTurns = DEFAULT_MAX_TURNS, model, resume, forkSession }: MakeOptions): SdkOptions => ({
  cwd,
  maxTurns,
  model,
  resume,
  // Meaningless without `resume`, and the SDK reads it only alongside one.
  forkSession: resume ? forkSession : undefined,
  systemPrompt: { type: 'preset', preset: 'claude_code', append: workingDirectoryPreamble(cwd) },
  permissionMode: 'dontAsk',
  allowedTools: [...READ_ONLY_TOOLS],
  disallowedTools: [...DENY_RULES],
  settingSources: [],
});
