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
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Collection } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { rootCollectionRule } from './capabilities/default-parent.ts';
import * as DiagramAppEvents from './DiagramAppEvents.ts';

const meta = Plugin.makeMeta({
  key: DXN.make(DiagramAppEvents.DIAGRAM_APP_KEY),
  name: 'Diagram',
  tags: ['system'],
});

/** One diagram, nothing else open: plugins that read the layout see a single-item workspace with no sidebars. */
const layout = Atom.make<AppCapabilities.Layout>({
  mode: 'diagram',
  dialogOpen: false,
  sidebarOpen: false,
  complementarySidebarOpen: false,
  workspace: 'default',
  active: [],
  inactive: [],
  scrollIntoView: undefined,
});

const Root = Capability.lazyModule(
  'Root',
  { provides: [Capabilities.ReactRoot], activatesOn: ActivationEvents.Startup },
  () => import('./capabilities/root.ts'),
);

/** The app shell in place of Composer's deck: the layout, the full-viewport root, and Composer's filing rule. */
export const DiagramAppPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'org.dxos.plugin.diagramApp.module.layout',
    activatesOn: ActivationEvents.Startup,
    provides: [AppCapabilities.Layout],
    activate: () => Effect.succeed([Capability.contribute(AppCapabilities.Layout, layout)]),
  }),
  Plugin.addModule({
    id: 'org.dxos.plugin.diagramApp.module.defaultParent',
    activatesOn: ActivationEvents.Startup,
    provides: [AppCapabilities.DefaultParent],
    activate: () => Effect.succeed([Capability.contribute(AppCapabilities.DefaultParent, rootCollectionRule)]),
  }),
  // Composer files every diagram in the space's root collection.
  Plugin.addModule(AppCapability.schema([Collection.Collection])),
  // Composer's members panel, used for Share, creates invitations through `SpaceOperation.Share` and reads its own
  // and the shell's strings.
  Plugin.addModule(AppCapability.operationHandler(() => import('./capabilities/operation-handler.ts'))),
  Plugin.addModule(AppCapability.translations(() => import('@dxos/plugin-space/translations'))),
  Plugin.addModule({
    id: 'org.dxos.plugin.diagramApp.module.schemaRegistered',
    activatesOn: DiagramAppEvents.Start,
    requires: [ClientCapabilities.SchemaRegistered],
    activate: () => Effect.succeed([]),
  }),
  Plugin.addModule(Root),
  Plugin.make,
);
