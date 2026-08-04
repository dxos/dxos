//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ExcalidrawSettings } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'plugin-settings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ExcalidrawSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
