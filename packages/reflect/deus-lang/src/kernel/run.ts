//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';

import { type ExecuteOptions, type RunResult, executeImage } from './execute.ts';
import { type HostOptions, createHost } from './host.ts';

/** How to run an image: host IO, machine diagnostics, and whether to compile lambdas to JS. */
export type RunOptions = HostOptions & ExecuteOptions;

/**
 * Runs an image's main against node's file system and process (`host.ts`).
 * Returns the process exit code instead of exiting, so tests can run images in-process.
 */
export const runImage = (image: string, options: RunOptions): RunResult => {
  const stderr = options.stderr ?? ((chunk: string) => process.stderr.write(chunk));
  return executeImage(image, {
    machine: options.machine,
    jit: options.jit,
    host: createHost(options),
    platform: { sha256: (text) => createHash('sha256').update(text, 'utf8').digest('hex'), stderr },
  });
};
