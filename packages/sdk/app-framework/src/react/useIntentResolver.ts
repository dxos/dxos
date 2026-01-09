//
// Copyright 2023 DXOS.org
//

import { useEffect } from 'react';

import * as Common from '../common';
import { type AnyIntentResolver } from '../plugin-intent';
import { usePluginManager } from '../react';

export const useIntentResolver = (module: string, resolver: AnyIntentResolver) => {
  const manager = usePluginManager();
  useEffect(() => {
    manager.context.contributeCapability({
      module,
      interface: Common.Capability.IntentResolver,
      implementation: resolver,
    });

    return () => manager.context.removeCapability(Common.Capability.IntentResolver, resolver);
  }, [module, resolver]);
};
