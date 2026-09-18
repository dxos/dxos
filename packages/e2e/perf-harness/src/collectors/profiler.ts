//
// Copyright 2026 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type Attached } from '../cdp.ts';
import { type RealmCpu } from '../types.ts';

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
  /**
   * Stops the stage's profile, writes one file per realm, and returns both the paths and the CPU
   * each realm actually spent.
   */
  endStage: () => Promise<{ files: string[]; cpu: RealmCpu[] }>;
};

/**
 * The one frame that means the realm was NOT working.
 *
 * Counted out because a profiler samples on a wall clock: a realm that slept through a stage still
 * produces a sample per interval, so raw sample count measures the stage's duration, not its cost.
 *
 * `(program)` is deliberately NOT here, though it looks like a sibling. V8's `EntryForVMState` maps
 * only `IDLE` to `(idle)`; `JS`, `COMPILER`, `OTHER` and `EXTERNAL` all map to `(program)`, which is
 * the realm doing work V8 could not attribute to a script — native code, compilation, an external
 * callback. Counting it as idle understated every realm's CPU. Measured across the 36 profiles of
 * one run: 69,591 `(idle)` samples against 1,958 `(program)`, the latter concentrated in the page
 * on render-heavy stages, so Chrome does report real idleness as `(idle)` and `(program)` was
 * ~2.0 s of discarded work. `(garbage collector)` counts too: a collecting realm is busy.
 */
const IDLE_FRAMES = new Set(['(idle)']);

type CpuProfile = {
  nodes: Array<{ id: number; callFrame: { functionName: string } }>;
  samples?: number[];
};

/**
 * CPU milliseconds a realm spent, from its profile.
 *
 * `(non-idle samples) x (sampling interval)`. This is the ONLY way to attribute CPU to a worker:
 * `SystemInfo.getProcessInfo` folds a dedicated worker into its renderer process, and the
 * `Performance` domain does not exist on a worker target at all.
 */
const sampledCpuMs = (profile: CpuProfile): { cpuMs: number; samples: number; idleSamples: number } => {
  const idleIds = new Set(
    profile.nodes.filter((node) => IDLE_FRAMES.has(node.callFrame.functionName)).map((node) => node.id),
  );
  const samples = profile.samples ?? [];
  const idleSamples = samples.filter((id) => idleIds.has(id)).length;
  return {
    cpuMs: Math.round(((samples.length - idleSamples) * SAMPLING_INTERVAL_US) / 1000),
    samples: samples.length,
    idleSamples,
  };
};

/**
 * Always-on sampling profiler across every realm, rotated at each stage boundary.
 *
 * Per stage AND per target: a whole-run profile attributes nothing to the step that regressed, and a page-only profile misses the shared worker
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

  const end = async (): Promise<{ files: string[]; cpu: RealmCpu[] }> => {
    const files: string[] = [];
    const cpu: RealmCpu[] = [];
    for (const target of started) {
      const result = await target.cdp.trySend<{ profile: CpuProfile }>('Profiler.stop');
      if (!result?.profile) {
        continue;
      }
      const file = path.join(outputDir, `${label}-${target.name.replace(/[^a-z0-9]+/gi, '_')}.cpuprofile`);
      writeFileSync(file, JSON.stringify(result.profile));
      files.push(file);
      cpu.push({ kind: target.kind, name: target.name, ...sampledCpuMs(result.profile) });
    }
    return { files, cpu };
  };

  return {
    beginStage: async (stageLabel: string, current: Attached[]): Promise<void> => {
      label = stageLabel;
      await begin(current);
    },
    endStage: end,
  };
};
