//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';
import * as ThemePlugin from '@dxos/plugin-theme/ThemePlugin';
import type * as StoryEmbed from '@dxos/storybook-testing/StoryEmbed';
import * as StoryPeers from '@dxos/storybook-testing/StoryPeers';

import { DEMO_TIMEOUT } from './frames.ts';

export type DemoStory = {
  load: () => Promise<StoryEmbed.Module>;
  /** Seeds once every peer has joined, so a large write does not hold up the other demos. */
  late?: boolean;
};

/** Every demo's story module, by demo id; its story is named in `DEMO_STORIES`. */
export const STORIES: Record<string, DemoStory> = {
  diagram: { load: () => import('@dxos/stories-echo/stories/Diagram'), late: true },
  editor: { load: () => import('@dxos/stories-echo/stories/Editor') },
  explorer: { load: () => import('@dxos/stories-echo/stories/Explorer') },
  views: { load: () => import('@dxos/stories-echo/stories/Views') },
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
  /** Marks this demo shown and releases its turn. */
  readonly done: () => void;
  /** Leaves the queue without counting as shown, as an unmounted demo does. */
  readonly cancel: () => void;
};

type Waiter = {
  readonly visible: () => boolean;
  readonly start: () => void;
};

type Scheduler = {
  readonly waiting: Waiter[];
  busy: boolean;
  /** Whether a hidden demo may boot: once a demo has shown, or no visible one did in time. */
  primed: boolean;
  timeout?: ReturnType<typeof setTimeout>;
};

const queue: Scheduler = { waiting: [], busy: false, primed: false };

const next = (scheduler: Scheduler) => {
  if (scheduler.busy || scheduler.waiting.length === 0) {
    return;
  }
  const visible = scheduler.waiting.findIndex((waiter) => waiter.visible());
  if (visible < 0 && !scheduler.primed) {
    return;
  }
  const [waiter] = scheduler.waiting.splice(Math.max(0, visible), 1);
  scheduler.busy = true;
  waiter.start();
};

/** Queues a demo to boot after the one before it shows; hidden demos wait for a demo to show first. */
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
      setTimeout(done, DEMO_TIMEOUT);
    },
  };
  const cancel = () => {
    if (state === 'waiting') {
      queue.waiting.splice(queue.waiting.indexOf(waiter), 1);
    }
    if (state === 'booting') {
      queue.busy = false;
    }
    state = 'done';
    next(queue);
  };
  const done = () => {
    queue.primed = true;
    cancel();
  };
  queue.waiting.push(waiter);
  queue.timeout ??= setTimeout(() => {
    queue.primed = true;
    next(queue);
  }, DEMO_TIMEOUT);
  next(queue);
  return { turn, done, cancel };
};

/** The peers and space every demo on the page shares, started by the first demo to mount. */
export const pageRuntime = (): StoryPeers.Runtime => {
  if (!runtime) {
    runtime = StoryPeers.make({ title: 'ECHO demos' });
  }
  return runtime;
};
