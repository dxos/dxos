//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';
import { useEffect, useState } from 'react';

import { getRawDoc, type Expando, type TextObject } from '@dxos/react-client/echo';

import { AutomergeStoreAdapter } from './automerge';

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
