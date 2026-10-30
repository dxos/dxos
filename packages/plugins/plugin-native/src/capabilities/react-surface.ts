//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import { NativeSettings } from '#containers';

import { NativeNamespace } from '../namespace.ts';
import { type NativeOptions } from '../settings-store.ts';

export default Capability.makeModule((options: NativeOptions) =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, NativeNamespace.key),
        component: NativeSettings,
        props: ({ data: { subject } }) => ({ subject, defaultAutoUpdate: options.defaultAutoUpdate }),
      }),
    ]),
  ),
);
