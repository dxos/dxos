//
// Copyright 2025 DXOS.org
//

import { createEffect, onCleanup } from 'solid-js';

import { type AnyIntentResolver, Common } from '@dxos/app-framework';

import { usePluginManager } from './usePluginManager';

export const useIntentResolver = (module: string, resolver: AnyIntentResolver) => {
  const manager = usePluginManager();

  createEffect(() => {
    manager.context.contributeCapability({
      module,
      interface: Common.Capability.IntentResolver,
      implementation: resolver,
    });

    onCleanup(() => {
      manager.context.removeCapability(Common.Capability.IntentResolver, resolver);
    });
  });
};
