//
// Copyright 2026 DXOS.org
//

import '@fontsource/poiret-one';

import * as Effect from 'effect/Effect';
import React from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { DXN } from '@dxos/keys';
import * as DeckSurface from '@dxos/plugin-deck/DeckSurface';
import * as PublicationLink from '@dxos/plugin-space/PublicationLink';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import { osTranslations } from '@dxos/ui-theme';

import { currentObjectPath } from './route.ts';

export type ViewerPluginOptions = {
  publicId: string;
  composerOrigin: string;
};

const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.viewer'),
  name: 'Viewer',
  tags: ['system'],
});

// Poiret One's ink is all x-height, so the line is lifted to centre on the sidebar toggle.
const ViewerWordmark = () => {
  const { t } = Hooks.useTranslation();
  return (
    <span
      className='self-center grow ms-1 text-2xl leading-none lowercase relative -top-[0.125em]'
      style={{ fontFamily: 'Poiret One' }}
    >
      {t('current-app.name', { ns: osTranslations })}
    </span>
  );
};

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
        window.location.assign(PublicationLink.forkUrl(composerOrigin, publicId, currentObjectPath()).toString())
      }
    />
  </div>
);

export const ViewerPlugin = (options: ViewerPluginOptions): Plugin.Plugin =>
  Plugin.define(meta).pipe(
    Plugin.addModule(
      Capability.inlineModule(
        'viewer-read-only',
        { provides: [AppCapabilities.ReadOnly], activatesOn: ActivationEvents.Startup },
        () => Effect.succeed([Capability.contribute(AppCapabilities.ReadOnly, true)]),
      ),
    ),
    Plugin.addModule(
      Capability.inlineModule('viewer-surfaces', { provides: [Capabilities.ReactSurface] }, () =>
        Effect.succeed([
          Capability.contribute(Capabilities.ReactSurface, [
            Surface.create({
              id: 'viewer.wordmark',
              filter: Surface.makeFilter(DeckSurface.BannerStart),
              component: ViewerWordmark,
            }),
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
