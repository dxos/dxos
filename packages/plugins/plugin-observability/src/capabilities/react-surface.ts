//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import { ObservabilitySettings } from '#containers';

import { ObservabilityNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'root',
        filter: AppSurface.settings(AppSurface.Article, ObservabilityNamespace.key),
        component: ObservabilitySettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
