//
// Copyright 2025 DXOS.org
//

import { createEffect, onCleanup } from 'solid-js';

import { type AnyIntentResolver, Capabilities } from '@dxos/app-framework';

import { usePluginManager } from './usePluginManager';

export const useIntentResolver = (module: string, resolver: AnyIntentResolver) => {
  const manager = usePluginManager();

  createEffect(() => {
    manager.context.contributeCapability({
      module,
      interface: Capabilities.IntentResolver,
      implementation: resolver,
    });

    onCleanup(() => {
      manager.context.removeCapability(Capabilities.IntentResolver, resolver);
    });
  });
};
