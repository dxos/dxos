//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';
import { useEffect, useState } from 'react';

import { type EchoReactiveObject } from '@dxos/echo-schema';
import { createDocAccessor } from '@dxos/react-client/echo';

import { AutomergeStoreAdapter } from './adapter';

export const useStoreAdapter = (object: EchoReactiveObject<any>, options = { timeout: 250 }): TLStore => {
  const [adapter] = useState(() => new AutomergeStoreAdapter(options));

  useEffect(() => {
    adapter.open(createDocAccessor(object, ['content']));
    return () => {
      // TODO(burdon): Throws error if still mounted.
      adapter.close();
    };
  }, [object]);

  return adapter.store;
};
