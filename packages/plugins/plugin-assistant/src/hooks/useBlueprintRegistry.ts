//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { Blueprint } from '@dxos/blueprints';

/**
 * Provide a registry of blueprints from plugins.
 */
// TODO(burdon): Reconcile with eventual public registry.
export const useBlueprintRegistry = () => {
  const blueprints = useCapabilities(Capabilities.BlueprintDefinition);
  return useMemo(() => new Blueprint.Registry(blueprints), [blueprints]);
};
