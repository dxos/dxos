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

/** The peers and space every demo on the page shares, started by the first demo to mount. */
export const pageRuntime = (): StoryPeers.Runtime => {
  if (!runtime) {
    runtime = StoryPeers.make({ title: 'ECHO demos' });
  }
  return runtime;
};
