//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { DXN } from '@dxos/keys';

const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.drawingApp'),
  name: 'drawing.sh',
  tags: ['system'],
});

/** One drawing, nothing else open: plugins that read the layout see a single-item workspace with no sidebars. */
const layout = Atom.make<AppCapabilities.Layout>({
  mode: 'drawing',
  dialogOpen: false,
  sidebarOpen: false,
  complementarySidebarOpen: false,
  workspace: 'default',
  active: [],
  inactive: [],
  scrollIntoView: undefined,
});

// The root pulls in the diagram engine and the illustrator's file model, so it loads as its own chunk after the entry paints.
const Root = Capability.lazyModule(
  'Root',
  { provides: [Capabilities.ReactRoot], activatesOn: ActivationEvents.Startup },
  () => import('./capabilities/root.ts'),
);

/** The app shell in place of Composer's deck: renders the open drawing full-viewport and nothing else. */
export const DrawingAppPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'org.dxos.plugin.drawingApp.module.layout',
    activatesOn: ActivationEvents.Startup,
    provides: [AppCapabilities.Layout],
    activate: () => Effect.succeed([Capability.contribute(AppCapabilities.Layout, layout)]),
  }),
  Plugin.addModule(Root),
  Plugin.make,
);
