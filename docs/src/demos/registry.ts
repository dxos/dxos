//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';
import * as ThemePlugin from '@dxos/plugin-theme/ThemePlugin';

import { companies } from './companies.ts';
import { type Demo } from './Demo.ts';
import { DiagramDemo } from './diagram/index.ts';
import { EditorDemo } from './editor/index.ts';
import { ExplorerDemo } from './explorer/index.ts';
import { DemoRuntime } from './runtime.ts';
import { ViewsDemo } from './views/index.ts';

/** Every demo, by id; the page decides which appear and in what order. */
export const DEMOS: Record<string, Demo> = Object.fromEntries(
  [DiagramDemo, EditorDemo, ExplorerDemo, ViewsDemo].map((demo) => [demo.id, demo as Demo]),
);

let runtime: DemoRuntime | undefined;

/**
 * Sets the theme plugin's appearance to dark before the demos start: the page is always dark, and the plugin would
 * otherwise follow the OS.
 */
const pinDarkAppearance = () => {
  try {
    localStorage.setItem(ThemePlugin.meta.profile.key, JSON.stringify({ appearance: 'dark' }));
  } catch (error) {
    log.warn('demos follow the OS theme: storage is unavailable', { error });
  }
};

/** The peers and space every demo on the page shares, started by the first demo to mount. */
export const pageRuntime = (): DemoRuntime => {
  if (!runtime) {
    pinDarkAppearance();
    runtime = new DemoRuntime({
      title: 'ECHO demos',
      shared: [companies],
      demos: [DEMOS.editor, DEMOS.views, DEMOS.explorer],
      // The diagram's content is by far the largest.
      late: [DEMOS.diagram],
    });
  }
  return runtime;
};

/** One demo on a page of its own, as the PLEX Overview embeds it, with its own peers and space. */
export const embedRuntime = (demo: Demo): DemoRuntime => {
  pinDarkAppearance();
  return new DemoRuntime({ title: demo.title, shared: [companies], demos: [demo] });
};
