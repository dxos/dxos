//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { getSpace } from '@dxos/react-client/echo';

import { AutomationSettings, FunctionsContainer } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.space-settings-functions`,
        role: 'article',
        filter: AppSurface.literal(`${meta.id}.space-settings-functions`),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <FunctionsContainer space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.space-settings-automation`,
        role: 'article',
        filter: AppSurface.literal(`${meta.id}.space-settings-automation`),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <AutomationSettings space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.companion.automation`,
        role: 'article',
        filter: AppSurface.and(AppSurface.literal('automation'), AppSurface.companion()),
        component: ({ data }) => {
          const space = getSpace(data.companionTo);
          if (!space) {
            return null;
          }
          return <AutomationSettings space={space} object={data.companionTo} />;
        },
      }),
    ]),
  ),
);
