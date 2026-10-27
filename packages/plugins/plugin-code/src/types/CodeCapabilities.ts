//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { CodeNamespace } from '../namespace.ts';
import type * as SettingsModule from './Settings.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<SettingsModule.Settings>>()(
  `${CodeNamespace.key}.capability.settings`,
);

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
  `${CodeNamespace.key}.capability.buildRun`,
);

/** A local checkout that synced specs resolve against. */
export type SpecRepoRoot = { readonly repo: string; readonly path: string };

/** The outcome of the last sync pass for one spec. */
export type SpecSyncEntry = {
  readonly status: 'synced' | 'pulled' | 'pushed' | 'conflict' | 'unresolved' | 'missing' | 'error';
  readonly path?: string;
  readonly error?: string;
  readonly timestamp: number;
};

export type SpecSyncState = {
  /** Whether this host reaches local files at all: the desktop app, or the dev server's route. */
  readonly available: boolean;
  readonly roots: ReadonlyArray<SpecRepoRoot>;
  /** Keyed by `Spec.id`. */
  readonly specs: Readonly<Record<string, SpecSyncEntry | undefined>>;
};

/** Two-way sync between specs that carry a `github.com/<owner>/<repo>` meta key and their local checkout. */
export const SpecSync = Capability.makeSingleton<{
  readonly state: Atom.Writable<SpecSyncState>;
  /** Runs a pass now instead of waiting for the next tick. */
  readonly syncNow: () => void;
}>()(`${CodeNamespace.key}.capability.specSync`);
