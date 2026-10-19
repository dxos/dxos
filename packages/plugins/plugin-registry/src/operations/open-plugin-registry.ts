//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as Operation from '@dxos/compute/Operation';

import { registryFilterAtom } from '../filter.ts';
import { REGISTRY_ID, getCategoryPath } from '../paths.ts';

const handler: Operation.WithHandler<typeof SettingsOperation.OpenPluginRegistry> =
  SettingsOperation.OpenPluginRegistry.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ filter }) {
        yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(REGISTRY_ID) });
        if (filter !== undefined) {
          const registry = yield* Capability.get(Capabilities.AtomRegistry);
          registry.set(registryFilterAtom, filter);
          // A filtered search targets a plugin that is off, which only the bundled category lists.
          yield* Operation.invoke(LayoutOperation.Open, { subject: [getCategoryPath('bundled')] });
        }
      }),
    ),
  );

export default handler;
