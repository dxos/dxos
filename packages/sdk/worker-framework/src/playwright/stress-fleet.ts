//
// Copyright 2026 DXOS.org
//

import { type BrowserContext, type Page } from '@playwright/test';

import type { StressStatus } from './harness/stress-harness';

/**
 * How long a tab may take to reach `connected`. Generous: leader election, worker spawn, and (on the
 * first load of a run) vite's on-demand dependency optimization all happen inside this budget.
 */
const CONNECT_TIMEOUT_MS = 60_000;

const HARNESS_POLL_MS = 100;

/**
 * Duration passed to `hangWorker` for a hang the worker never returns from. Declared here rather
 * than beside the harness: this module is loaded in Node by the spec, and the harness module pulls
 * in the browser-only connection.
 */
export const HANG_FOREVER_MS = 1e12;

/**
 * One real browser tab running the stress harness story. Every accessor goes through
 * `window.__workerStress` rather than the DOM, so the assertions read framework state instead of
 * rendered text.
 */
export class StressTab {
  constructor(
    readonly label: string,
    readonly page: Page,
  ) {}

  get closed(): boolean {
    return this.page.isClosed();
  }

  status = (): Promise<StressStatus | undefined> =>
    this.page.evaluate(() => globalThis.window.__workerStress?.status());

  /** Waits for the harness to install and its connection to open. */
  waitConnected = async (timeout = CONNECT_TIMEOUT_MS): Promise<void> => {
    await this.page.waitForFunction(() => globalThis.window.__workerStress?.status().connected === true, undefined, {
      timeout,
      polling: HARNESS_POLL_MS,
    });
  };

  increment = (): Promise<number> => this.page.evaluate(() => globalThis.window.__workerStress!.increment());

  ping = (): Promise<number> => this.page.evaluate(() => globalThis.window.__workerStress!.ping());

  /** Fire-and-forget: the RPC may never resolve, which is the point. */
  hangWorker = (durationMs: number): Promise<void> =>
    this.page.evaluate((ms) => globalThis.window.__workerStress!.hangWorker(ms), durationMs);

  /** Fire-and-forget: starves this tab's leader heartbeat so peers judge it stale and steal the lock. */
  blockMainThread = (durationMs: number): Promise<void> =>
    this.page.evaluate((ms) => globalThis.window.__workerStress!.blockMainThread(ms), durationMs);

  reload = async (): Promise<void> => {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  };

  close = async (): Promise<void> => {
    if (!this.page.isClosed()) {
      await this.page.close({ runBeforeUnload: false });
    }
  };
}

/**
 * The set of live tabs under test. All tabs share ONE {@link BrowserContext}, which is what makes
 * them peers: Web Locks (leader election, worker liveness) and the SharedWorker coordinator are
 * scoped per context+origin, so tabs in separate contexts would each get their own worker and the
 * suite would assert nothing.
 */
export class StressFleet {
  readonly #context: BrowserContext;
  readonly #url: string;
  readonly #tabs: StressTab[] = [];
  #nextLabel = 0;

  constructor(context: BrowserContext, url: string) {
    this.#context = context;
    this.#url = url;
  }

  get tabs(): readonly StressTab[] {
    return this.#tabs;
  }

  /** Opens a tab and waits for it to connect. */
  openTab = async (): Promise<StressTab> => {
    const tab = await this.openTabWithoutWaiting();
    await tab.waitConnected();
    return tab;
  };

  /**
   * Opens a tab without waiting for its connection — used by the atomic commands, where waiting
   * between the two halves would defeat the race being provoked.
   */
  openTabWithoutWaiting = async (): Promise<StressTab> => {
    const page = await this.#context.newPage();
    const tab = new StressTab(`tab-${this.#nextLabel++}`, page);
    this.#tabs.push(tab);
    await page.goto(this.#url, { waitUntil: 'domcontentloaded' });
    return tab;
  };

  closeTab = async (tab: StressTab): Promise<void> => {
    const index = this.#tabs.indexOf(tab);
    if (index >= 0) {
      this.#tabs.splice(index, 1);
    }
    await tab.close();
  };

  closeAllTabs = async (): Promise<void> => {
    const tabs = this.#tabs.splice(0, this.#tabs.length);
    await Promise.all(tabs.map((tab) => tab.close()));
  };

  /** The tab holding the leader lock, if any tab currently reports itself the owner. */
  findLeader = async (): Promise<StressTab | undefined> => {
    for (const tab of this.#tabs) {
      const status = await tab.status().catch(() => undefined);
      if (status?.isOwner) {
        return tab;
      }
    }
    return undefined;
  };
}
