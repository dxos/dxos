//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ExcalidrawSettings } from '#containers';
import { meta } from '#meta';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'pluginSettings',
          filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
          component: ExcalidrawSettings,
          props: ({ data: { subject } }) => ({ subject }),
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.article'],
  },
);
