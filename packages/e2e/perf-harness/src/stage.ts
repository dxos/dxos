//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

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
import { diffDisk, readDisk } from './collectors/disk.ts';
import { type Screencast } from './collectors/frames.ts';
import { readDomCounters, readHeap, readProcessFootprint, sumAppFootprint, sumHeapUsed } from './collectors/memory.ts';
import { diffNetwork } from './collectors/network.ts';
import { type ProfileSession } from './collectors/profiler.ts';
import { installWorkerProbe, readResponsiveness } from './collectors/responsiveness.ts';
import { type RpcReading, diffRpc, readRpc } from './collectors/rpc.ts';
import { STAGE_MARK_PREFIX } from './collectors/tracing.ts';
import {
  type Comparability,
  type DiskMetrics,
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
  debugPort: number;
  network: () => NetworkMetrics;
  comparability: Comparability;
  /**
   * Where to write one screenshot per stage. Omit to take none.
   *
   * Taken AFTER every boundary read, so the capture cannot land inside the interval it depicts —
   * one `page.screenshot` per stage is a rounding error next to the flow, but only because it is
   * outside the measured window rather than because it is fast.
   */
  screenshotDir?: string;
};

/** A boundary reading: everything sampled together, so a stage's deltas describe one interval. */
type Boundary = {
  at: number;
  cpu: ProcessCpu;
  thread: ThreadMetrics;
  threadByRealm: RealmThreadMetrics[];
  network: NetworkMetrics;
  disk: DiskMetrics;
  rpc: RpcReading[];
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

  /**
   * A user-timing mark delimiting the stage, which is how a browser-wide trace attributes work.
   *
   * Inside the measured window on purpose: a mark is a single `performance.mark` call, and moving
   * it outside would leave the trace's stage boundaries offset from `wallMs`'s.
   */
  async #mark(id: string, edge: 'begin' | 'end'): Promise<void> {
    await this.#options.page
      .evaluate((name: string) => performance.mark(name), `${STAGE_MARK_PREFIX}${id}:${edge}`)
      .catch(() => undefined);
  }

  /** One PNG per stage, for a reviewer who wants to see what the numbers describe. */
  async #screenshot(id: string): Promise<string | undefined> {
    const { screenshotDir, page } = this.#options;
    if (!screenshotDir) {
      return undefined;
    }
    const file = path.join(screenshotDir, `${id}.png`);
    // Never fatal, and that includes creating the directory: this runs after the stage's error
    // boundary has closed, so a throw here rejects `stage()` before it pushes the measured row —
    // losing the measurement over its illustration.
    try {
      mkdirSync(screenshotDir, { recursive: true });
    } catch {
      return undefined;
    }
    return page
      .screenshot({ path: file })
      .then(() => file)
      .catch(() => undefined);
  }

  /** Runs one stage, bracketing `body` with the boundary reads. */
  async stage(id: string, body: () => Promise<void>): Promise<StageRow> {
    const { page, browserCdp, debugPort, network, mode } = this.#options;

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
      disk: await readDisk(this.#targets),
      rpc: await readRpc(this.#targets),
    };

    let ok = true;
    let error: string | undefined;
    try {
      await this.#mark(id, 'begin');
      await body();
    } catch (caught) {
      // Recorded rather than thrown: a stage that fails still produced the metrics up to its
      // failure, and a flow that aborts mid-way leaves no row saying which stage broke.
      ok = false;
      error = caught instanceof Error ? caught.message : String(caught);
    }

    await this.#mark(id, 'end');
    const wallMs = Date.now() - before.at;
    const cpu = diffProcessCpu(before.cpu, await readProcessCpu(browserCdp));
    const thread = pageTarget
      ? diffThreadMetrics(before.thread, await readThreadMetrics(pageTarget))
      : { ...EMPTY_THREAD };
    const networkDelta = diffNetwork(before.network, network());
    // Read BEFORE the refresh, so a realm is diffed against the same realm set the opening boundary
    // saw; one that appeared mid-stage is picked up by the refresh and reported whole, which is
    // correct — it did all its work inside this stage.
    const threadByRealm = diffRealmThreadMetrics(before.threadByRealm, await readRealmThreadMetrics(this.#targets));

    // Refreshed before the per-realm readings: a stage can BRING a realm into existence — `boot` is
    // where the shared worker running ECHO first appears — and a set captured only at the opening
    // boundary would report that stage's heap as the page's alone.
    this.#targets = await refreshTargets(debugPort, this.#targets);

    // AFTER the refresh, unlike the readings above, and the difference is load-bearing. SQLite runs
    // in the dedicated worker, and `boot` is the stage that creates it: read against the opening
    // set, boot found no instrumented realm at either boundary and reported `realms: 0` with no
    // I/O, so opening the database and running migrations — the largest disk event in the flow —
    // was missing from every run. A realm that appeared during the stage contributes its whole
    // counters, which is right: it did that work inside this stage.
    const diskDelta = diffDisk(before.disk, await readDisk(this.#targets));
    // After the refresh for the same reason as disk: `boot` is the stage that creates the worker
    // serving every later RPC, so a set captured at the opening boundary would miss it entirely.
    const rpc = diffRpc(before.rpc, await readRpc(this.#targets));

    const responsiveness = await readResponsiveness(page, this.#targets);
    const domCounters = await readDomCounters(this.#targets.find((target) => target.kind === 'page'));

    // LAST of the closing reads, and at the boundary rather than sampled. It starts and ends a
    // trace around one dump, which costs ~100 ms — an order of magnitude more than every other
    // read here — so taking it first put the harness's own overhead, and whatever the app did
    // during it, inside the CPU, thread, network, disk and RPC deltas that close the same stage.
    const footprint = await readProcessFootprint(browserCdp);

    const stills = this.#instruments.screencast?.endStage();
    const profiled = await this.#instruments.profiler?.endStage();
    const profiles = profiled?.files ?? [];

    // Heap last, because it forces a GC: read earlier it would charge the collection's CPU to this
    // stage, and read before the DOM counters it would drop nodes the stage had just created.
    const heap = await readHeap(this.#targets);

    // After the heap read, which is the last thing charged to the stage: a screenshot forces a
    // paint and a PNG encode, and neither belongs in this stage's numbers or the next one's.
    const shot = await this.#screenshot(id);

    const artifacts = [...profiles, ...(stills?.files ?? []), ...(shot ? [shot] : [])];
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
      footprint,
      appFootprintBytes: sumAppFootprint(footprint),
      domNodes: domCounters.nodes,
      domListeners: domCounters.listeners,
      domDocuments: domCounters.documents,
      network: networkDelta,
      disk: diskDelta,
      rpc,
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
