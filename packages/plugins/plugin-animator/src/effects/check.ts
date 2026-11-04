//
// Copyright 2026 DXOS.org
//

//
// A headless run of an effect (`CheckEffect`): what an agent reads instead of watching the motion. It compiles the
// source, runs it over a span, reports step timings, checks that each time gives the same frame reached forward and
// backward (so from different checkpoints, F-5.2), and summarises what each frame drew.
//

import { type EffectStatus, type ModuleCompiler, STEP_BUDGET_MS, hashSeed } from '@dxos/animation';

import { type Animation, type AnimatorCapabilities } from '#types';

import { bindingTrack } from './binding.ts';
import { EffectCore, loadEffect } from './core.ts';
import { type BindingTrack, type EffectJob } from './types.ts';

export type CheckEffectOptions = {
  compile: ModuleCompiler;
  source: string;
  renderer: Animation.EffectRenderer;
  params: Record<string, unknown>;
  schema?: Record<string, unknown>;
  seed?: number;
  /** Seconds to run over. */
  duration: number;
  /** What the effect binds to; a ring of four linked objects (`a` to `d`) when unset. */
  binding?: BindingTrack;
  /** The times to draw; eight across the duration when unset. */
  times?: readonly number[];
  budgetMs?: number;
  /** Milliseconds for timing steps; `performance.now` where there is one. */
  now?: () => number;
};

export type EffectCheckFrame = { t: number; items: number; summary: string };

export type EffectReport = {
  /** Compile or load errors; nothing else is reported when there are any. */
  errors?: string[];
  status?: EffectStatus;
  timing?: { meanMs: number; budgetMs: number };
  /** Whether every time gave the same frame run forward and run backward (restoring from checkpoints). */
  deterministic?: boolean;
  /** The first time the two runs differed at, when they did. */
  mismatch?: number;
  frames?: EffectCheckFrame[];
};

const RING = ['a', 'b', 'c', 'd'];
const COLORS = ['#5b8def', '#2fbf71', '#e57bd1', '#f2c230'];

/** Four objects on a ring of radius 40, each linked to the next: what an effect is checked against by default. */
export const syntheticBinding = (): AnimatorCapabilities.StageBinding => {
  const objects = Object.fromEntries(
    RING.map((id, index) => {
      const angle = (index / RING.length) * Math.PI * 2;
      const position = { x: Math.round(Math.cos(angle) * 40), y: Math.round(Math.sin(angle) * 40), z: 0 };
      return [id, { id, position, radius: 8, color: COLORS[index], opacity: 1 }];
    }),
  );
  const links = RING.map((from, index) => {
    const to = RING[(index + 1) % RING.length];
    return { id: `${from}-${to}`, from, to, points: [objects[from].position, objects[to].position] };
  });
  return { objects, links };
};

/** A frame's items counted by kind: `12 circle, 1 card`. */
export const summarise = (frame: AnimatorCapabilities.EffectFrame | undefined): string => {
  const counts = new Map<string, number>();
  for (const item of frame?.items ?? []) {
    const kind = 'primitive' in item ? item.primitive : item.kind;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return counts.size === 0 ? 'nothing' : [...counts].map(([kind, count]) => `${count} ${kind}`).join(', ');
};

const INSTANCE = 'check';
const KEY = 'check@0';

export const checkEffect = async ({
  compile,
  source,
  renderer,
  params,
  schema,
  seed = hashSeed(INSTANCE),
  duration,
  binding,
  times,
  budgetMs = STEP_BUDGET_MS,
  now = typeof performance === 'undefined' ? () => 0 : () => performance.now(),
}: CheckEffectOptions): Promise<EffectReport> => {
  const compiled = await compile(source);
  if (compiled.errors) {
    return { errors: compiled.errors };
  }
  try {
    loadEffect(compiled.code);
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : String(error)] };
  }
  const track = binding ?? bindingTrack(duration, syntheticBinding, 1);
  const job: EffectJob = {
    instance: INSTANCE,
    key: KEY,
    renderer,
    params,
    ...(schema ? { schema } : {}),
    seed,
    start: 0,
    end: duration,
    tracks: [],
  };
  const run = (options: ConstructorParameters<typeof EffectCore>[0]) => {
    const core = new EffectCore(options);
    core.handle({ type: 'load', key: KEY, code: compiled.code });
    core.handle({ type: 'shot', binding: track, jobs: [job] });
    return core;
  };
  const sorted = [...(times ?? Array.from({ length: 8 }, (_, index) => (index * duration) / 7))].sort(
    (left, right) => left - right,
  );

  const forward = run({ budgetMs, now });
  const ahead = sorted.map((t) => ({ t, frame: forward.frames(t)[0] }));
  // Backwards, on a fresh run: each time is reached from a different checkpoint than going forward.
  const backward = run({ budgetMs });
  const behind = new Map([...sorted].reverse().map((t) => [t, JSON.stringify(backward.frames(t)[0]?.items ?? [])]));
  const mismatch = ahead.find(({ t, frame }) => behind.get(t) !== JSON.stringify(frame?.items ?? []))?.t;
  const last = ahead.at(-1)?.frame;

  return {
    status: last?.status ?? { state: 'running' },
    timing: { meanMs: last?.stepMs ?? 0, budgetMs },
    deterministic: mismatch === undefined,
    ...(mismatch !== undefined ? { mismatch } : {}),
    frames: ahead.map(({ t, frame }) => ({ t, items: frame?.items.length ?? 0, summary: summarise(frame) })),
  };
};
