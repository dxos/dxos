//
// Copyright 2026 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type Attached } from '../cdp.ts';

/**
 * V8 sampling interval.
 *
 * The default 1000 µs costs a few percent on JS-heavy frames. That bias is accepted rather than
 * minimized because it is CONSTANT and because `diagnose` rows are never trended or compared
 * against `measure` rows — the profile is there so a nightly regression arrives with its
 * callstack instead of needing a reproduction.
 */
const SAMPLING_INTERVAL_US = 1000;

export type ProfileSession = {
  /**
   * Stops the current stage's profile, writes it, and starts the next stage's.
   *
   * Takes the target list rather than closing over it: realms come and go mid-flow, and a shared
   * worker that started during stage 2 must be profiled for stage 3.
   */
  cut: (nextLabel: string, targets: Attached[]) => Promise<string[]>;
  stop: () => Promise<string[]>;
};

/**
 * Always-on sampling profiler across every realm, rotated at each stage boundary.
 *
 * Per stage AND per target: a whole-run profile for a flow this long runs to hundreds of MB and
 * attributes nothing to the step that regressed, and a page-only profile misses the shared worker
 * that does the database work.
 */
export const startProfiling = async (
  targets: Attached[],
  outputDir: string,
  firstLabel: string,
): Promise<ProfileSession> => {
  mkdirSync(outputDir, { recursive: true });

  let label = firstLabel;
  const started: Attached[] = [];

  const begin = async (current: Attached[]) => {
    started.length = 0;
    for (const target of current) {
      const enabled = await target.cdp.trySend('Profiler.enable');
      if (enabled === undefined) {
        continue;
      }
      await target.cdp.trySend('Profiler.setSamplingInterval', { interval: SAMPLING_INTERVAL_US });
      if ((await target.cdp.trySend('Profiler.start')) !== undefined) {
        started.push(target);
      }
    }
  };

  const end = async (): Promise<string[]> => {
    const files: string[] = [];
    for (const target of started) {
      const result = await target.cdp.trySend<{ profile: unknown }>('Profiler.stop');
      if (!result?.profile) {
        continue;
      }
      const file = path.join(outputDir, `${label}-${target.name.replace(/[^a-z0-9]+/gi, '_')}.cpuprofile`);
      writeFileSync(file, JSON.stringify(result.profile));
      files.push(file);
    }
    return files;
  };

  await begin(targets);

  return {
    cut: async (nextLabel: string, current: Attached[]): Promise<string[]> => {
      const files = await end();
      label = nextLabel;
      await begin(current);
      return files;
    },
    stop: end,
  };
};
