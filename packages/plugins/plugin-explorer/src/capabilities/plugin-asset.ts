//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { ExplorerNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.promise(() => import('../../PLUGIN.mdl?raw')).pipe(
    Effect.map(({ default: content }) => [
      Capability.contribute(AppCapabilities.PluginAsset, {
        pluginId: ExplorerNamespace.key,
        path: 'PLUGIN.mdl',
        content,
        mimeType: 'application/x-mdl',
      }),
    ]),
  ),
);
