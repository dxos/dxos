//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import { DXN } from '@dxos/keys';
import * as DeckSurface from '@dxos/plugin-deck/DeckSurface';
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

/** The viewer's own chrome: the banner notice with Sign up and Fork. */
export const ViewerPlugin = (options: ViewerPluginOptions): Plugin.Plugin =>
  Plugin.define(meta).pipe(
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
