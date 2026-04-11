//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { useSpaces } from '@dxos/react-client/echo';

import { ConnectionsPanel } from '#containers';
import { meta } from '#meta';

/** Uses activeSpace if available, falls back to first space. */
const ConnectionsWithSpace = () => {
  const activeSpace = useActiveSpace();
  const allSpaces = useSpaces();
  const space = activeSpace ?? allSpaces[0];

  if (!space) {
    return (
      <div className='flex items-center justify-center p-8 text-description text-sm'>
        No space available. Create a space first.
      </div>
    );
  }

  return <ConnectionsPanel space={space} />;
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'connections-settings',
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: () => <ConnectionsWithSpace />,
      }),
      Surface.create({
        id: 'connections-companion',
        role: 'deck-companion--connections',
        filter: AppSurface.literalSection('connections'),
        component: () => <ConnectionsWithSpace />,
      }),
    ]),
  ),
);
