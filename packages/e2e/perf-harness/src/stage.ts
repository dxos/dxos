//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

import { type Attached, type Cdp, detachAll, refreshTargets } from './cdp.ts';
import {
  type ProcessCpu,
  diffProcessCpu,
  diffRealmThreadMetrics,
  diffThreadMetrics,
  readProcessCpu,
  readRealmThreadMetrics,
  readThreadMetrics,
} from './collectors/cpu.ts';
import { type Screencast } from './collectors/frames.ts';
import { readDomCounters, readHeap, sumHeapUsed, trackPeakRss } from './collectors/memory.ts';
import { diffNetwork } from './collectors/network.ts';
import { type ProfileSession } from './collectors/profiler.ts';
import { installWorkerProbe, readResponsiveness } from './collectors/responsiveness.ts';
import {
  type Comparability,
  type Mode,
  type NetworkMetrics,
  type RealmThreadMetrics,
  type StageRow,
  type ThreadMetrics,
} from './types.ts';

const EMPTY_THREAD: ThreadMetrics = {
  taskMs: 0,
  scriptMs: 0,
  layoutMs: 0,
  recalcStyleMs: 0,
  v8CompileMs: 0,
  threadTimeMs: 0,
  processTimeMs: 0,
  layoutCount: 0,
  recalcStyleCount: 0,
};

/** The stateful, cross-boundary collectors, which can only start once the page target exists. */
export type Instruments = {
  profiler?: ProfileSession;
  screencast?: Screencast;
};

export type RunnerOptions = {
  flow: string;
  mode: Mode;
  /** Fixture size as a stable label (`tasks=2000,depth=3`), so rows group by tier. */
  scale: string;
  iteration: number;
  page: Page;
  /** Browser-level CDP target — the only one that answers `SystemInfo.getProcessInfo`. */
  browserCdp: Cdp;
  /** Root pid of the browser process tree, for the RSS reading. */
  browserPid: number;
  debugPort: number;
  network: () => NetworkMetrics;
  comparability: Comparability;
};

/** A boundary reading: everything sampled together, so a stage's deltas describe one interval. */
type Boundary = {
  at: number;
  cpu: ProcessCpu;
  thread: ThreadMetrics;
  threadByRealm: RealmThreadMetrics[];
  network: NetworkMetrics;
};

/**
 * Drives a flow's stages, recording one row per stage.
 *
 * A stage id is the unit of measurement AND of description: each one matches a step `id:` in the
 * flow's `.mdl` QA test, so the spec and the numbers join with no second mapping to keep in sync.
 */
export class StageRunner {
  readonly #options: RunnerOptions;
  readonly #rows: StageRow[] = [];
  #instruments: Instruments = {};
  #fixtureSize: number | undefined;
  #targets: Attached[] = [];
  #index = 0;

  constructor(options: RunnerOptions) {
    this.#options = options;
  }

  get rows(): StageRow[] {
    return this.#rows;
  }

  get targets(): Attached[] {
    return this.#targets;
  }

  /** Records what the fixture actually built, once it is known. */
  setFixtureSize(size: number): void {
    this.#fixtureSize = size;
  }

  /** Adopts an already-attached set, so the caller can start the profiler before the first stage. */
  adopt(targets: Attached[]): void {
    this.#targets = targets;
  }

  /**
   * Installs the profiler and screencast after construction.
   *
   * Separate from the constructor because both need an attached page target, which does not exist
   * until the app has booted — and `boot` is itself a measured stage.
   */
  attachInstruments(instruments: Instruments): void {
    this.#instruments = instruments;
  }

  /** Runs one stage, bracketing `body` with the boundary reads. */
  async stage(id: string, body: () => Promise<void>): Promise<StageRow> {
    const { page, browserCdp, browserPid, debugPort, network, mode } = this.#options;

    this.#targets = await refreshTargets(debugPort, this.#targets);
    const pageTarget = this.#targets.find((target) => target.kind === 'page');
    // A worker that appeared since the last boundary has no probe yet; the call is idempotent.
    await Promise.all(this.#targets.map(installWorkerProbe));

    // Named for the stage about to run, so every artifact says which stage it covers.
    this.#instruments.screencast?.beginStage(id);
    await this.#instruments.profiler?.beginStage(id, this.#targets);

    // Drained and discarded: samples produced between stages belong to neither, and leaving them
    // would charge the previous stage's tail to this one.
    await readResponsiveness(page, this.#targets).catch(() => undefined);

    const before: Boundary = {
      at: Date.now(),
      cpu: await readProcessCpu(browserCdp),
      thread: pageTarget ? await readThreadMetrics(pageTarget) : { ...EMPTY_THREAD },
      threadByRealm: await readRealmThreadMetrics(this.#targets),
      network: network(),
    };
    const stopRss = trackPeakRss(browserPid);

    let ok = true;
    let error: string | undefined;
    try {
      await body();
    } catch (caught) {
      // Recorded rather than thrown: a stage that fails still produced the metrics up to its
      // failure, and a flow that aborts mid-way leaves no row saying which stage broke.
      ok = false;
      error = caught instanceof Error ? caught.message : String(caught);
    }

    const wallMs = Date.now() - before.at;
    const peakRssBytes = stopRss();
    const cpu = diffProcessCpu(before.cpu, await readProcessCpu(browserCdp));
    const thread = pageTarget
      ? diffThreadMetrics(before.thread, await readThreadMetrics(pageTarget))
      : { ...EMPTY_THREAD };
    const networkDelta = diffNetwork(before.network, network());
    // Read before the target refresh below, so a realm is diffed against the same realm set the
    // opening boundary saw; one that appeared mid-stage is picked up by the refresh and reported
    // whole, which is correct — it did all its work inside this stage.
    const threadByRealm = diffRealmThreadMetrics(before.threadByRealm, await readRealmThreadMetrics(this.#targets));

    // Refreshed again before the per-realm readings: a stage can BRING a realm into existence —
    // `boot` is where the shared worker running ECHO first appears — and a set captured only at
    // the opening boundary would report that stage's heap as the page's alone.
    this.#targets = await refreshTargets(debugPort, this.#targets);

    const responsiveness = await readResponsiveness(page, this.#targets);
    const domCounters = await readDomCounters(this.#targets.find((target) => target.kind === 'page'));

    const stills = this.#instruments.screencast?.endStage();
    const profiled = await this.#instruments.profiler?.endStage();
    const profiles = profiled?.files ?? [];

    // Heap last, because it forces a GC: read earlier it would charge the collection's CPU to this
    // stage, and read before the DOM counters it would drop nodes the stage had just created.
    const heap = await readHeap(this.#targets);

    const artifacts = [...profiles, ...(stills?.files ?? [])];
    const row: StageRow = {
      flow: this.#options.flow,
      stage: id,
      stageIndex: this.#index,
      mode,
      scale: this.#options.scale,
      ...(this.#fixtureSize === undefined ? {} : { fixtureSize: this.#fixtureSize }),
      iteration: this.#options.iteration,
      ok,
      ...(error ? { error } : {}),
      wallMs,
      cpuMsTotal: cpu.totalMs,
      cpuMsByProcess: cpu.byProcess,
      thread,
      threadByRealm,
      ...(profiled ? { cpuMsByRealm: profiled.cpu } : {}),
      heap,
      heapUsedTotalBytes: sumHeapUsed(heap),
      peakRssBytes,
      domNodes: domCounters.nodes,
      domListeners: domCounters.listeners,
      domDocuments: domCounters.documents,
      network: networkDelta,
      responsiveness: {
        ...responsiveness,
        ...(stills ? { stillFrameMaxMs: stills.maxMs, stillFrameCount: stills.count } : {}),
      },
      comparability: this.#options.comparability,
      ...(artifacts.length > 0 ? { artifacts } : {}),
    };

    this.#index += 1;
    this.#rows.push(row);
    return row;
  }

  /** Closes every CDP session the run opened. */
  dispose(): void {
    detachAll(this.#targets);
    this.#targets = [];
  }
}
