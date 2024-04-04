//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';
import { useEffect, useState } from 'react';

import { type Expando, type TextObject, getRawDoc } from '@dxos/react-client/echo';

import { AutomergeStoreAdapter } from './adapter';

export const useStoreAdapter = (data: TextObject | Expando, options = { timeout: 250 }): TLStore => {
  const [adapter] = useState(() => new AutomergeStoreAdapter(options));

  useEffect(() => {
    adapter.open(getRawDoc(data, ['content']));
    return () => {
      // TODO(burdon): Throws error if still mounted.
      // adapter.close();
    };
  }, [data]);

  return adapter.store;
};
