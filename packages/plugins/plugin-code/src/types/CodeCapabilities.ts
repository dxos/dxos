//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as acp from '@agentclientprotocol/sdk';
import type * as Effect from 'effect/Effect';
import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import type * as Protocol from '../agents/Protocol.ts';
import type { AgentError } from '../errors.ts';
import type * as SettingsModule from './Settings.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<SettingsModule.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/**
 * The desktop app's agent helper (`dx-agent`): the only way the webview can start a coding agent,
 * since it cannot spawn processes itself. Contributed only in the desktop app.
 */
export type AgentHelper = {
  /** The agents the helper can launch, and whether each can run on this machine. */
  readonly agents: Effect.Effect<readonly Protocol.AgentStatus[], AgentError>;
  /** Starts an agent working in `cwd` and returns its ACP connection. */
  readonly connect: (agent: string, cwd: string) => Effect.Effect<acp.Stream, AgentError>;
  /** Git worktrees in the app's data folder, which delegated chats work in. */
  readonly worktrees: {
    /** The worktree for `key`, created on first use; a folder that is not a repository is returned as is. */
    readonly ensure: (request: Protocol.WorktreeRequest) => Effect.Effect<Protocol.Worktree, AgentError>;
    /** Removes a worktree, keeping its branch; one with uncommitted changes is kept (`dirty`). */
    readonly remove: (key: string) => Effect.Effect<Protocol.WorktreeOutcome, AgentError>;
    readonly list: Effect.Effect<readonly Protocol.Worktree[], AgentError>;
  };
};

export const AgentHelper = Capability.makeSingleton<AgentHelper>()(`${meta.profile.key}.capability.agentHelper`);

/**
 * Diagnostic shape mirroring `compiler.Diagnostic`. Re-declared here (rather
 * than re-exported) to keep this types module free of compiler-runtime
 * dependencies — operation results carry this shape over the wire.
 */
export type Diagnostic = {
  readonly path?: string;
  readonly line?: number;
  readonly column?: number;
  readonly severity: 'error' | 'warning';
  readonly code?: number;
  readonly message: string;
};

export type BuildEntry = { readonly path: string; readonly source: string };

export type BuildState = {
  readonly ok: boolean;
  readonly diagnostics: ReadonlyArray<Diagnostic>;
  readonly entry?: BuildEntry;
  readonly timestamp: number;
};

export type RunState = {
  readonly ok: boolean;
  readonly stdout: ReadonlyArray<string>;
  readonly stderr: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<Diagnostic>;
  readonly timestamp: number;
};

/** Per-`CodeProject.id` build/run record. Transient; not persisted to ECHO. */
export type ProjectBuildState = {
  readonly busy?: 'build' | 'run';
  readonly lastBuild?: BuildState;
  readonly lastRun?: RunState;
};

/** Map of `CodeProject.id` → most-recent build/run record. */
export type BuildRunState = Readonly<Record<string, ProjectBuildState | undefined>>;

/**
 * Atom capability holding transient build/run state per CodeProject. Lives
 * outside React so it survives `CodeArticle` remount and so the agent can
 * (later) read/write build status without going through the editor.
 */
export const BuildRun = Capability.makeSingleton<Atom.Writable<BuildRunState>>()(
  `${meta.profile.key}.capability.buildRun`,
);
