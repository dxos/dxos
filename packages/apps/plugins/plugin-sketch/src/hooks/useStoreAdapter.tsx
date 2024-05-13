//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type EchoReactiveObject } from '@dxos/echo-schema';
import { createDocAccessor } from '@dxos/react-client/echo';

import { AutomergeStoreAdapter, type StoreAdapter } from './adapter';

export const useStoreAdapter = (object: EchoReactiveObject<any>, options = { timeout: 250 }): StoreAdapter => {
  const [adapter] = useState(() => new AutomergeStoreAdapter(options));
  useEffect(() => {
    if (!object) {
      return;
    }

    adapter.open(createDocAccessor(object, ['content']));
    return () => {
      adapter.close();
    };
  }, [object]);

  return adapter;
};
