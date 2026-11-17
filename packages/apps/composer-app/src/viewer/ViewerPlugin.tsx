//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/keys';
import * as DeckSurface from '@dxos/plugin-deck/DeckSurface';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import * as Publication from '@dxos/plugin-space/Publication';
import * as Button from '@dxos/react-ui/Button';

import { currentObjectPath } from './route.ts';

export type ViewerPluginOptions = {
  publicId: string;
  /** Composer's origin, where Sign up and Fork land. */
  composerOrigin: string;
};

const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.viewer'),
  name: 'Viewer',
  tags: ['system'],
});

const ViewerActions = ({ publicId, composerOrigin }: Pick<ViewerPluginOptions, 'publicId' | 'composerOrigin'>) => (
  <div className='flex items-center gap-2 pe-2' data-testid='viewer.actions'>
    <span className='text-sm text-description whitespace-nowrap'>Read-only copy</span>
    <Button.Root
      variant='outline'
      label='Sign up'
      data-testid='viewer.signUp'
      onClick={() => window.location.assign(new URL('/', composerOrigin).toString())}
    />
    <Button.Root
      variant='primary'
      icon='ph--git-fork--regular'
      label='Fork'
      data-testid='viewer.fork'
      onClick={() =>
        window.location.assign(Publication.forkUrl(composerOrigin, publicId, currentObjectPath()).toString())
      }
    />
  </div>
);

/**
 * Makes the whole app read-only, drops telemetry, and adds the viewer's own chrome: the banner notice with Sign up and
 * Fork.
 */
export const ViewerPlugin = (options: ViewerPluginOptions): Plugin.Plugin =>
  Plugin.define(meta).pipe(
    Plugin.addModule(
      // Startup, so it is in place before anything renders or expands the graph.
      Capability.inlineModule(
        'viewer-read-only',
        { provides: [AppCapabilities.ReadOnly], activatesOn: ActivationEvents.Startup },
        () => Effect.succeed([Capability.contribute(AppCapabilities.ReadOnly, true)]),
      ),
    ),
    Plugin.addModule(
      // An anonymous viewer sends no telemetry, so the events other plugins schedule are dropped here.
      Capability.inlineModule(
        'viewer-telemetry',
        { provides: [Capabilities.OperationHandler], activatesOn: ActivationEvents.Startup },
        () =>
          Effect.succeed([
            Capability.contribute(
              Capabilities.OperationHandler,
              OperationHandlerSet.make(Operation.withHandler(ObservabilityOperation.SendEvent, () => Effect.void)),
            ),
          ]),
      ),
    ),
    Plugin.addModule(
      Capability.inlineModule('viewer-surfaces', { provides: [Capabilities.ReactSurface] }, () =>
        Effect.succeed([
          Capability.contribute(Capabilities.ReactSurface, [
            Surface.create({
              id: 'viewer.actions',
              filter: Surface.makeFilter(DeckSurface.BannerEnd),
              component: () => <ViewerActions publicId={options.publicId} composerOrigin={options.composerOrigin} />,
            }),
          ]),
        ]),
      ),
    ),
    Plugin.make,
  )();
