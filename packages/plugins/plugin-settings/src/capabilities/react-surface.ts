//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { DefaultSettings } from '#containers';

// `DefaultSettings` is registered with `position: Position.last` so a
// plugin-specific surface (matching by prefix) always wins under the settings
// article's `limit={1}` dispatch.
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'defaultPluginSettings',
        position: Position.last,
        filter: AppSurface.settings(AppSurface.Article),
        component: DefaultSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
