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
  /** Resolves once every demo queued before this one shows its content. */
  readonly turn: Promise<void>;
  /** Marks this demo's content as shown, which starts the next demo's turn. */
  readonly done: () => void;
};

let previous: Promise<void> = Promise.resolve();

/** Queues a demo to boot after the ones before it have shown their content, so they never share the CPU. */
export const queueBoot = (): BootTurn => {
  const turn = previous;
  let done!: () => void;
  const shown = new Promise<void>((resolve) => {
    done = resolve;
  });
  // A story shows on mount, before it paints its content; the next demo waits for that to finish.
  previous = turn.then(() => shown).then(idle);
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
