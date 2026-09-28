//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { sleep, waitForCondition } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import * as Client from './Client.ts';
import {
  type Connected,
  type Hub,
  type HubCoordinator,
  type WorkerHandle,
  createHub,
  createRecordingWorker,
  postRunnerReady,
  uniqueKeys,
} from './testing/harness.ts';
import { seededRandom } from './testing/seeded-random.ts';

const TIMEOUTS: Client.LeaderTimeouts = {
  heartbeatInterval: 20,
  staleTimeout: 120,
  portTimeout: 300,
  retryBackoff: 10,
};
const MAX_TABS = 4;
/** Longest disruption; well inside the 15s handle budget, which a run cannot afford to hit. */
const MAX_DISRUPTION_MS = 400;
const CONVERGENCE_TIMEOUT_MS = 10_000;

const positiveIntEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  invariant(Number.isInteger(value) && value >= 1, `${name} must be a positive integer`);
  return value;
};

// Replayable: a failure names its seed, and a soak dials the count up.
const SEEDS = process.env.DX_MODEL_SEED
  ? [positiveIntEnv('DX_MODEL_SEED', 1)]
  : Array.from({ length: positiveIntEnv('DX_MODEL_SEEDS', 4) }, (_, index) => index + 1);
const COMMANDS = positiveIntEnv('DX_MODEL_COMMANDS', 25);

type TabState = {
  coordinator: HubCoordinator | undefined;
  session: Connected | undefined;
  handlesOpen: number;
  handlesClosed: number;
  reconnects: number;
  openError: unknown;
  /** Connect attempts whose handle must throw before one opens. */
  failNextConnects: number;
};

type Tab = TabState & {
  readonly label: string;
  readonly connection: Client.Connection;
  readonly opened: Promise<void>;
};

/**
 * Every tab, worker and link the walk can act on, plus the counters the invariants read.
 */
class World {
  readonly hub: Hub = createHub();
  readonly keys = uniqueKeys();
  readonly tabs: Tab[] = [];
  readonly workers: WorkerHandle[] = [];
  readonly worker = createRecordingWorker(this.keys.storageLockKey, {
    onCreate: (handle) => this.workers.push(handle),
  });
  /** Disruptions still to be undone before the world may be judged converged. */
  readonly pendingRestores: Promise<void>[] = [];
  #nextLabel = 0;

  openTab(): Tab {
    const label = `tab-${this.#nextLabel++}`;
    const state: TabState = {
      coordinator: undefined,
      session: undefined,
      handlesOpen: 0,
      handlesClosed: 0,
      reconnects: 0,
      openError: undefined,
      failNextConnects: 0,
    };
    const connection = new Client.Connection({
      createWorker: this.worker.createWorker,
      createCoordinator: () => {
        state.coordinator = this.hub.connect();
        return state.coordinator;
      },
      leaderLockKey: this.keys.leaderLockKey,
      leaderTimeouts: TIMEOUTS,
      onConnect: async (session) => {
        if (state.failNextConnects > 0) {
          state.failNextConnects--;
          throw new Error(`TEST: ${label} connect failed on purpose`);
        }
        postRunnerReady(session.workerToClient);
        state.session = session;
        state.handlesOpen++;
        return {
          close: async () => {
            state.handlesClosed++;
            if (state.session === session) {
              state.session = undefined;
            }
          },
        };
      },
    });
    connection.reconnected.on(() => {
      state.reconnects++;
    });
    const opened = connection.open().then(
      () => {},
      (err: unknown) => {
        state.openError = err;
      },
    );
    const tab: Tab = Object.assign(state, { label, connection, opened });
    this.tabs.push(tab);
    return tab;
  }

  async closeTab(tab: Tab): Promise<void> {
    const index = this.tabs.indexOf(tab);
    if (index >= 0) {
      this.tabs.splice(index, 1);
    }
    // `Resource.close()` is a no-op while `open()` is pending, so a tab is only closable once it settled.
    await tab.opened;
    await tab.connection.close();
  }

  get liveWorkers(): WorkerHandle[] {
    return this.workers.filter((worker) => !worker.closed);
  }

  /** Undoes `disrupt` after `ms`, and keeps the walk from ending before it has. */
  restoreAfter(ms: number, restore: () => void): void {
    this.pendingRestores.push(sleep(ms).then(restore));
  }
}

type Command = {
  readonly name: string;
  readonly enabled?: (world: World) => boolean;
  readonly run: (world: World, random: () => number) => Promise<string>;
};

const pick = <T>(random: () => number, items: readonly T[]): T => {
  invariant(items.length > 0, 'cannot pick from an empty list');
  return items[Math.floor(random() * items.length)];
};

const duration = (random: () => number): number => 50 + Math.floor(random() * (MAX_DISRUPTION_MS - 50));

/** A tab whose coordinator link is currently up, with that link. */
const pickLiveLink = (world: World, random: () => number): { tab: Tab; coordinator: HubCoordinator } => {
  const candidates = world.tabs.flatMap((tab) =>
    tab.coordinator?.link === 'up' ? [{ tab, coordinator: tab.coordinator }] : [],
  );
  return pick(random, candidates);
};

/**
 * Everything the walk can do to the system. Every command is recoverable by construction: each
 * disruption is undone within {@link MAX_DISRUPTION_MS}, so the invariants must hold once the dust settles.
 */
const COMMAND_SET: readonly Command[] = [
  {
    name: 'open-tab',
    enabled: (world) => world.tabs.length < MAX_TABS,
    run: async (world) => world.openTab().label,
  },
  {
    name: 'close-tab',
    enabled: (world) => world.tabs.length > 0,
    run: async (world, random) => {
      const tab = pick(random, world.tabs);
      await world.closeTab(tab);
      return tab.label;
    },
  },
  {
    name: 'reload-tab',
    enabled: (world) => world.tabs.length > 0,
    run: async (world, random) => {
      const tab = pick(random, world.tabs);
      await world.closeTab(tab);
      return `${tab.label} -> ${world.openTab().label}`;
    },
  },
  {
    // A crash: the worker's locks release and every tab has to fail over to a new one.
    name: 'kill-worker',
    enabled: (world) => world.liveWorkers.length > 0,
    run: async (world) => {
      world.worker.requestShutdown();
      return '';
    },
  },
  {
    // A CPU-hung worker: keeps its locks, answers nothing, then catches up on everything at once.
    name: 'hang-worker',
    enabled: (world) => world.liveWorkers.some((worker) => !worker.paused),
    run: async (world, random) => {
      const worker = pick(
        random,
        world.liveWorkers.filter((candidate) => !candidate.paused),
      );
      const ms = duration(random);
      worker.pause();
      world.restoreAfter(ms, () => worker.resume());
      return `${ms}ms`;
    },
  },
  {
    // A blocked main thread: heartbeats stop, inbound traffic queues, then everything lands at once.
    name: 'block-tab',
    enabled: (world) => world.tabs.some((tab) => tab.coordinator?.link === 'up'),
    run: async (world, random) => {
      const { tab, coordinator } = pickLiveLink(world, random);
      const ms = duration(random);
      coordinator.setLink('paused');
      world.restoreAfter(ms, () => coordinator.setLink('up'));
      return `${tab.label} ${ms}ms`;
    },
  },
  {
    // A coordinator port that drops everything for a while: messages in flight are simply lost.
    name: 'break-tab-link',
    enabled: (world) => world.tabs.some((tab) => tab.coordinator?.link === 'up'),
    run: async (world, random) => {
      const { tab, coordinator } = pickLiveLink(world, random);
      const ms = duration(random);
      coordinator.setLink('broken');
      world.restoreAfter(ms, () => coordinator.setLink('up'));
      return `${tab.label} ${ms}ms`;
    },
  },
  {
    name: 'drop-request-port',
    enabled: (world) => world.tabs.length > 0,
    run: async (world, random) => {
      const tab = pick(random, world.tabs);
      world.hub.dropNextRequestPort(tab.connection.clientId);
      return tab.label;
    },
  },
  {
    // A slow leader: the reply arrives late, possibly after the tab has moved on to another attempt.
    name: 'delay-provide-port',
    enabled: (world) => world.tabs.length > 0,
    run: async (world, random) => {
      const tab = pick(random, world.tabs);
      const ms = duration(random);
      world.hub.holdProvidePorts(tab.connection.clientId);
      world.restoreAfter(ms, () => void world.hub.releaseProvidePorts(tab.connection.clientId));
      return `${tab.label} ${ms}ms`;
    },
  },
  {
    name: 'fail-next-connect',
    enabled: (world) => world.tabs.length > 0,
    run: async (world, random) => {
      const tab = pick(random, world.tabs);
      tab.failNextConnects++;
      return tab.label;
    },
  },
  {
    name: 'fail-next-session',
    run: async (world) => {
      world.worker.failNextSessions(1);
      return '';
    },
  },
  {
    name: 'wait',
    run: async (_world, random) => {
      const ms = Math.floor(random() * 150);
      await sleep(ms);
      return `${ms}ms`;
    },
  },
];

type Violation = string;

/**
 * What must hold once every disruption has been undone: one live worker, every open tab connected
 * to it through exactly one handle, the worker holding exactly those sessions, and no leaked listeners.
 */
const violations = async (world: World): Promise<Violation[]> => {
  const found: Violation[] = [];
  const { tabs } = world;

  for (const tab of tabs) {
    if (tab.openError) {
      found.push(`${tab.label} open() rejected: ${String(tab.openError)}`);
    }
    if (!tab.session) {
      found.push(`${tab.label} is not connected`);
    }
    const live = tab.handlesOpen - tab.handlesClosed;
    if (live !== 1) {
      found.push(`${tab.label} has ${live} live handles (opened ${tab.handlesOpen}, closed ${tab.handlesClosed})`);
    }
    // One permanent heartbeat listener, one for the connected attempt, one for the leader session.
    const listeners = tab.coordinator?.onMessage.listenerCount() ?? 0;
    if (listeners > 3) {
      found.push(`${tab.label} has ${listeners} coordinator listeners`);
    }
  }

  const liveWorkers = world.liveWorkers.length;
  if (liveWorkers !== (tabs.length > 0 ? 1 : 0)) {
    found.push(`${liveWorkers} live workers for ${tabs.length} tabs`);
  }

  const workerIds = new Set(tabs.map((tab) => tab.session?.livenessLockKey));
  if (tabs.length > 0 && workerIds.size !== 1) {
    found.push(`tabs disagree on the worker: ${[...workerIds].join(', ')}`);
  }
  const leaderIds = new Set(tabs.map((tab) => tab.session?.leaderId));
  if (tabs.length > 0 && leaderIds.size !== 1) {
    found.push(`tabs disagree on the leader: ${[...leaderIds].join(', ')}`);
  }
  const owners = tabs.filter((tab) => tab.session?.isOwner).length;
  if (tabs.length > 0 && owners !== 1) {
    found.push(`${owners} tabs believe they own the worker`);
  }

  const expectedSessions = tabs.map((tab) => tab.connection.clientId).sort();
  const liveSessions = world.worker.liveSessions().sort();
  if (liveSessions.join() !== expectedSessions.join()) {
    const short = (ids: string[]) => ids.map((id) => id.slice(-8)).join(',');
    found.push(`worker serves sessions [${short(liveSessions)}] for tabs [${short(expectedSessions)}]`);
  }

  const { held } = await navigator.locks.query();
  const heldNames = (held ?? []).map(({ name }) => name);
  const leaderLocks = heldNames.filter((name) => name === world.keys.leaderLockKey).length;
  if (leaderLocks !== (tabs.length > 0 ? 1 : 0)) {
    found.push(`${leaderLocks} holders of the leader lock`);
  }
  const storageLocks = heldNames.filter((name) => name === world.keys.storageLockKey).length;
  if (storageLocks !== (tabs.length > 0 ? 1 : 0)) {
    found.push(`${storageLocks} holders of the storage lock`);
  }
  const [workerId] = workerIds;
  if (workerId && !heldNames.includes(workerId)) {
    found.push('the agreed worker does not hold its liveness lock');
  }

  return found;
};

const runWalk = async (seed: number): Promise<void> => {
  const random = seededRandom(seed);
  const world = new World();
  const history: string[] = [];

  // Two tabs to start: leadership is only observable with a peer.
  world.openTab();
  world.openTab();

  try {
    for (let index = 0; index < COMMANDS; index++) {
      const applicable = COMMAND_SET.filter((command) => command.enabled?.(world) ?? true);
      const command = pick(random, applicable);
      const detail = await command.run(world, random);
      history.push(detail ? `${command.name}(${detail})` : command.name);
    }

    await Promise.all(world.pendingRestores);
    // At least one tab, or "converged" is vacuous.
    if (world.tabs.length === 0) {
      history.push(`open-tab(${world.openTab().label})`);
    }
    await Promise.all(world.tabs.map((tab) => tab.opened));

    const settled = await waitForCondition({
      condition: async () => (await violations(world)).length === 0,
      timeout: CONVERGENCE_TIMEOUT_MS,
      interval: 50,
    }).then(
      () => true,
      () => false,
    );
    const remaining = await violations(world);
    log.info('model walk finished', { seed, settled, history });
    expect(remaining, `seed ${seed} did not converge after: ${history.join(' > ')}`).toEqual([]);
  } finally {
    await Promise.all(world.pendingRestores);
    await Promise.all([...world.tabs].map((tab) => world.closeTab(tab)));
  }
};

/**
 * Seeded random walk over tabs, workers and links, asserting the system converges back to one
 * worker shared by every surviving tab. Replay a failure with `DX_MODEL_SEED=<seed>`; soak with
 * `DX_MODEL_SEEDS=<count> DX_MODEL_COMMANDS=<count>`.
 */
describe('Connection model walk', () => {
  test.each(SEEDS)(
    'converges after a random storm (seed %i)',
    async (seed) => {
      await runWalk(seed);
    },
    60_000,
  );
});
