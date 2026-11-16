//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Collection } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { DiagramAppNamespace } from './namespace.ts';
import { DiagramAppCapabilities, DiagramAppEvents } from './types/index.ts';

const meta = Plugin.makeMeta({
  key: DXN.make(DiagramAppNamespace.key),
  name: 'Diagram',
  tags: ['system'],
});

const Layout = Capability.lazyModule(
  'Layout',
  { provides: [AppCapabilities.Layout, DiagramAppCapabilities.LayoutState], activatesOn: ActivationEvents.Startup },
  () => import('./capabilities/layout.ts'),
);

const Root = Capability.lazyModule(
  'Root',
  { provides: [Capabilities.ReactRoot], activatesOn: ActivationEvents.Startup },
  () => import('./capabilities/root.ts'),
);

/**
 * The app shell in place of Composer's deck: the layout plugin. It holds the open space and diagram, answers the
 * layout operations other plugins call (dialogs, popovers, toasts, opening an item), and renders the full-viewport root.
 */
export const DiagramAppPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Layout),
  // The app files every diagram in the space's root collection from its first write, before SpacePlugin's schemas
  // register at idle.
  Plugin.addModule(AppCapability.schema([Collection.Collection])),
  Plugin.addModule(AppCapability.operationHandler(() => import('./capabilities/operation-handler.ts'))),
  Plugin.addModule({
    id: 'org.dxos.plugin.diagramApp.module.schemaRegistered',
    activatesOn: DiagramAppEvents.Start,
    requires: [ClientCapabilities.SchemaRegistered],
    activate: () => Effect.succeed([]),
  }),
  Plugin.addModule(Root),
  Plugin.make,
);
