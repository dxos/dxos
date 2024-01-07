//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { useIntent } from './IntentContext';
import type { IntentResolver } from './intent';

export const useIntentResolver = (plugin: string, resolver: IntentResolver) => {
  const { registerResolver } = useIntent();

  useEffect(() => {
    return registerResolver(plugin, resolver);
  }, [plugin, resolver]);
};
