//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';
import * as ThemePlugin from '@dxos/plugin-theme/ThemePlugin';
import type * as StoryEmbed from '@dxos/storybook-testing/StoryEmbed';
import * as StoryPeers from '@dxos/storybook-testing/StoryPeers';

export type DemoStory = {
  load: () => Promise<StoryEmbed.Module>;
  name: string;
  /** Seeds once every peer has joined, so a large write does not hold up the other demos. */
  late?: boolean;
};

/** Every demo, by id; the page decides which appear and in what order. */
export const STORIES: Record<string, DemoStory> = {
  diagram: { load: () => import('@dxos/stories-echo/stories/Diagram'), name: 'Diagram', late: true },
  editor: { load: () => import('@dxos/stories-echo/stories/Editor'), name: 'Editor' },
  explorer: { load: () => import('@dxos/stories-echo/stories/Explorer'), name: 'Explorer' },
  views: { load: () => import('@dxos/stories-echo/stories/Views'), name: 'Views' },
};

let runtime: StoryPeers.Runtime | undefined;

/** Sets the theme plugin's appearance to dark: the demos are always dark, and the plugin would follow the OS. */
export const pinDarkAppearance = () => {
  try {
    localStorage.setItem(ThemePlugin.meta.profile.key, JSON.stringify({ appearance: 'dark' }));
  } catch (error) {
    log.warn('demos follow the OS theme: storage is unavailable', { error });
  }
};

export type BootTurn = {
  /** Resolves when this demo may boot. */
  readonly turn: Promise<void>;
  /** Marks this demo's content as shown; the next demo boots once the browser is idle. */
  readonly done: () => void;
};

type Waiter = {
  readonly visible: () => boolean;
  readonly start: () => void;
};

type Scheduler = {
  readonly waiting: Waiter[];
  busy: boolean;
};

/** How long a demo may hold its turn without reporting its content. */
const TURN_TIMEOUT = 20_000;

const queue: Scheduler = { waiting: [], busy: false };

/** Starts the first visible waiting demo, or the first waiting one, unless a demo is booting. */
const next = (scheduler: Scheduler) => {
  if (scheduler.busy || scheduler.waiting.length === 0) {
    return;
  }
  const index = Math.max(
    0,
    scheduler.waiting.findIndex((waiter) => waiter.visible()),
  );
  const [waiter] = scheduler.waiting.splice(index, 1);
  scheduler.busy = true;
  waiter.start();
};

/**
 * Queues a demo to boot once the demo booting before it shows its content, so two demos never share the CPU. A visible
 * demo goes ahead of hidden ones.
 */
export const queueBoot = (visible: () => boolean): BootTurn => {
  let state: 'waiting' | 'booting' | 'done' = 'waiting';
  let resolve!: () => void;
  const turn = new Promise<void>((resolveTurn) => {
    resolve = resolveTurn;
  });
  const waiter: Waiter = {
    visible,
    start: () => {
      state = 'booting';
      resolve();
      setTimeout(done, TURN_TIMEOUT);
    },
  };
  const done = () => {
    if (state === 'waiting') {
      // Booted out of turn, as a selected tab does; it no longer needs one.
      queue.waiting.splice(queue.waiting.indexOf(waiter), 1);
    }
    const releases = state === 'booting';
    state = 'done';
    if (releases) {
      // A story shows on mount, before it paints its content; the next demo waits for that to finish.
      void idle().then(() => {
        queue.busy = false;
        next(queue);
      });
    }
  };
  queue.waiting.push(waiter);
  next(queue);
  return { turn, done };
};

const idle = () =>
  new Promise<void>((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 2_000 });
    } else {
      setTimeout(resolve, 200);
    }
  });

/** The peers and space every demo on the page shares, started by the first demo to mount. */
export const pageRuntime = (): StoryPeers.Runtime => {
  if (!runtime) {
    runtime = StoryPeers.make({ title: 'ECHO demos' });
  }
  return runtime;
};
