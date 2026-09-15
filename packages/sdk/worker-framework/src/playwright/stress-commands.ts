//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { HANG_FOREVER_MS, type StressFleet, type StressTab } from './stress-fleet.ts';

/** Bounded worker hang, long enough to outlast the leader stale timeout (5s) it is meant to provoke. */
const HANG_WORKER_MS = 8_000;
/** Bounded main-thread block, long enough for a peer to judge this leader stale and steal the lock. */
const BLOCK_MAIN_THREAD_MS = 8_000;
/** Ceiling on concurrently open tabs, so a random walk cannot exhaust the container's memory. */
const MAX_TABS = 5;

export type StressCommandContext = {
  readonly fleet: StressFleet;
  /** Deterministic RNG, seeded per run so a failure is replayable from its seed. */
  readonly random: () => number;
  readonly log: (message: string) => void;
};

export type StressCommand = {
  readonly name: string;
  /** Skipped when it cannot apply (e.g. closing a tab with none open). */
  readonly enabled?: (ctx: StressCommandContext) => boolean;
  readonly run: (ctx: StressCommandContext) => Promise<void>;
};

const pick = <T>({ random }: StressCommandContext, items: readonly T[]): T => {
  // Asserted rather than encoded in the `T` return type alone: a future command that forgets its
  // `enabled` guard would otherwise get `undefined` typed as `T` and fail somewhere unrelated.
  invariant(items.length > 0, 'cannot pick from an empty list');
  return items[Math.floor(random() * items.length)];
};

const pickTab = (ctx: StressCommandContext): StressTab => pick(ctx, ctx.fleet.tabs);

/**
 * Everything the suite throws at the worker. Each command leaves the system in a state the recovery
 * assertions must be able to reach from — no command is allowed to be unrecoverable by design.
 */
export const STRESS_COMMANDS: readonly StressCommand[] = [
  {
    name: 'open-tab',
    enabled: ({ fleet }) => fleet.tabs.length < MAX_TABS,
    run: async ({ fleet, log }) => {
      const tab = await fleet.openTab();
      log(`opened ${tab.label}`);
    },
  },
  {
    name: 'close-tab',
    // Never the last tab: closing every tab is its own command, and doing it here would leave the
    // walk with nothing to act on for the rest of the run.
    enabled: ({ fleet }) => fleet.tabs.length > 1,
    run: async (ctx) => {
      const tab = pickTab(ctx);
      await ctx.fleet.closeTab(tab);
      ctx.log(`closed ${tab.label}`);
    },
  },
  {
    name: 'reload-tab',
    enabled: ({ fleet }) => fleet.tabs.length > 0,
    run: async (ctx) => {
      const tab = pickTab(ctx);
      await tab.reload();
      ctx.log(`reloaded ${tab.label}`);
    },
  },
  {
    name: 'close-all-tabs-and-open-new',
    run: async ({ fleet, log }) => {
      await fleet.closeAllTabs();
      const tab = await fleet.openTabWithoutWaiting();
      log(`recycled all tabs into ${tab.label}`);
    },
  },
  {
    name: 'hang-worker',
    enabled: ({ fleet }) => fleet.tabs.length > 0,
    run: async (ctx) => {
      const tab = pickTab(ctx);
      await tab.hangWorker(HANG_WORKER_MS);
      ctx.log(`hung worker for ${HANG_WORKER_MS}ms via ${tab.label}`);
    },
  },
  {
    name: 'block-leader-main-thread',
    enabled: ({ fleet }) => fleet.tabs.length > 1,
    run: async (ctx) => {
      const leader = (await ctx.fleet.findLeader()) ?? pickTab(ctx);
      await leader.blockMainThread(BLOCK_MAIN_THREAD_MS);
      ctx.log(`blocked main thread of ${leader.label} for ${BLOCK_MAIN_THREAD_MS}ms`);
    },
  },
  {
    // The steal path proper: a wedged leader still holds the lock, and the joining tab is the only
    // party that notices — it times out waiting for `provide-port`, judges the leader stale, and
    // steals. Blocking the leader alone provokes nothing while its worker keeps serving existing
    // tabs, which is why the two halves are one command.
    name: 'block-leader-main-thread-and-open-tab',
    // Bounded by MAX_TABS like `open-tab`: this command grows the fleet too, so without the ceiling
    // a long soak walks past it.
    enabled: ({ fleet }) => fleet.tabs.length > 0 && fleet.tabs.length < MAX_TABS,
    run: async (ctx) => {
      const leader = (await ctx.fleet.findLeader()) ?? pickTab(ctx);
      await leader.blockMainThread(BLOCK_MAIN_THREAD_MS);
      const joiner = await ctx.fleet.openTabWithoutWaiting();
      ctx.log(`blocked leader ${leader.label} for ${BLOCK_MAIN_THREAD_MS}ms, then opened ${joiner.label}`);
    },
  },
  {
    // The nastiest one, and the reason the two halves are a single command: a worker wedged in an
    // unbreakable busy loop, then every tab that could observe it destroyed before it yields. The
    // replacement tab must elect itself, spawn a new worker, and displace the old one's storage lock.
    name: 'hang-worker-forever-and-recycle-tabs',
    enabled: ({ fleet }) => fleet.tabs.length > 0,
    run: async (ctx) => {
      const tab = pickTab(ctx);
      await tab.hangWorker(HANG_FOREVER_MS);
      await ctx.fleet.closeAllTabs();
      const replacement = await ctx.fleet.openTabWithoutWaiting();
      ctx.log(`hung worker forever via ${tab.label}, recycled tabs into ${replacement.label}`);
    },
  },
  {
    name: 'increment-counter',
    enabled: ({ fleet }) => fleet.tabs.length > 0,
    run: async (ctx) => {
      const tab = pickTab(ctx);
      // A wedged worker never answers, and that is a legal state mid-storm — the recovery phase, not
      // this command, decides whether the system came back.
      const value = await tab.increment().catch((err) => `failed (${err.message})`);
      ctx.log(`increment via ${tab.label} -> ${value}`);
    },
  },
];

/** Small, deterministic PRNG (mulberry32) so a run is replayable from its seed alone. */
export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Runs one random applicable command. Returns its name, or undefined if none applied. */
export const runRandomCommand = async (ctx: StressCommandContext): Promise<string | undefined> => {
  const applicable = STRESS_COMMANDS.filter((command) => command.enabled?.(ctx) ?? true);
  if (applicable.length === 0) {
    return undefined;
  }
  const command = pick(ctx, applicable);
  await command.run(ctx);
  return command.name;
};
