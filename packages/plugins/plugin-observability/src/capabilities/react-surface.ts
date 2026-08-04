//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { meta } from '#meta';

import { ObservabilitySettingsSurface } from './ObservabilitySettingsSurface';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'root',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ObservabilitySettingsSurface,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
