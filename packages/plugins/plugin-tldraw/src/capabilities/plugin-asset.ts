//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import content from '../../PLUGIN.mdl?raw';
import { TldrawNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(AppCapabilities.PluginAsset, {
      pluginId: TldrawNamespace.key,
      path: 'PLUGIN.mdl',
      content,
      mimeType: 'application/x-mdl',
    }),
  ),
);
