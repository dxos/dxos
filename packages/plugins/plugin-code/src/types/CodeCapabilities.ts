//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

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
export const BuildRun = Capability.makeSingleton<Atom.Writable<BuildRunState>>(
  `${meta.profile.key}.capability.build-run`,
);
