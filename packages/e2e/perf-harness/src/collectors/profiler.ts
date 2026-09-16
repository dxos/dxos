//
// Copyright 2026 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type Attached } from '../cdp.ts';

/**
 * V8 sampling interval.
 *
 * The default 1000 µs. Accepted rather than minimized because `diagnose` rows are never trended
 * nor compared against `measure` rows — the profile exists so a regression `measure` detected
 * arrives with its callstack instead of needing a reproduction. Do not read the overhead as small:
 * profiling every realm alongside the screencast slowed a 200-task render by an order of
 * magnitude, which is why `diagnose` needs its own (much larger) timeouts.
 */
const SAMPLING_INTERVAL_US = 1000;

export type ProfileSession = {
  /**
   * Starts a stage's profile, naming its artifacts after that stage.
   *
   * Takes the target list rather than closing over it: realms come and go mid-flow, and a shared
   * worker that started during one stage must be profiled for the next.
   */
  beginStage: (label: string, targets: Attached[]) => Promise<void>;
  /** Stops the stage's profile and writes one file per realm, named for the stage. */
  endStage: () => Promise<string[]>;
};

/**
 * Always-on sampling profiler across every realm, rotated at each stage boundary.
 *
 * Per stage AND per target: a whole-run profile for a flow this long runs to hundreds of MB and
 * attributes nothing to the step that regressed, and a page-only profile misses the shared worker
 * that does the database work. Files are named for the stage they cover, which is the whole reason
 * the profile is worth keeping — a reviewer reading a regression should not have to reconstruct
 * which stage an artifact belongs to.
 */
export const startProfiling = (outputDir: string): ProfileSession => {
  mkdirSync(outputDir, { recursive: true });

  let label = 'unstarted';
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

  return {
    beginStage: async (stageLabel: string, current: Attached[]): Promise<void> => {
      label = stageLabel;
      await begin(current);
    },
    endStage: end,
  };
};
