//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import type * as PluginManager from '@dxos/app-framework/PluginManager';
import { type Database, type Type } from '@dxos/echo';

import { SpaceCapabilities, SpaceEvents } from '#types';

/**
 * Tells the plugins a type was added (plugin-table makes a table for it). Activation first, since it is
 * what makes a lazy module contribute its `OnTypeAdded` callback.
 */
export const notifyTypeAdded = Effect.fnUntraced(function* (
  managers: { plugins: PluginManager.PluginManager; capabilities: CapabilityManager.CapabilityManager },
  params: { db: Database.Database; type: Type.AnyEntity; show?: boolean },
) {
  yield* managers.plugins.activate(SpaceEvents.TypeAdded);
  const callbacks = managers.capabilities.getAll(SpaceCapabilities.OnTypeAdded);
  yield* Effect.all(
    callbacks.map((callback) => callback(params)),
    { concurrency: 'unbounded' },
  );
});
