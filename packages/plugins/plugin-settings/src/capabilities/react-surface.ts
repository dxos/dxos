//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { DefaultSettings, SettingsScope } from '#containers';

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
      // In the plank header rather than the panel body: the sync scope belongs to the panel, not to
      // any one field, and the header is the one place every plugin shares — most render their own
      // settings surface instead of `DefaultSettings`, and would otherwise get no control at all.
      Surface.create({
        id: 'settingsScope',
        filter: AppSurface.subject(AppSurface.NavbarEnd, AppCapabilities.isSettings),
        component: SettingsScope,
        props: ({ data: { subject } }) => ({ prefix: subject.prefix }),
      }),
    ]),
  ),
);
