//
// Copyright 2026 DXOS.org
//

/** What to run or build for this checkout's seed: the cached native CLI, a failed build's log, or a build to start. */
export type Native = {
  binary?: string;
  failed?: string;
  build?: { dir: string; binary: string };
};

/** The SHA-256 of the seed image this checkout runs, or undefined without one. */
export declare const seedHash: (env?: NodeJS.ProcessEnv) => string | undefined;

/** The native CLI to run for the checked-in seed, or what to build when there is none. */
export declare const nativeFor: (env: NodeJS.ProcessEnv) => Native;

/** Starts `build` detached and niced, unless another build of the same seed holds the lock. */
export declare const startNativeBuild: (build: { dir: string }) => void;
