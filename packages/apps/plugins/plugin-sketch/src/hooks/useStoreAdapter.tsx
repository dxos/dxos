//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';
import { useEffect, useState } from 'react';

import { type Expando, TypedObject, type TextObject, getRawDoc } from '@dxos/react-client/echo';

import { AutomergeStoreAdapter } from './automerge';
import { YjsStoreAdapter } from './yjs';

export const useStoreAdapter = (data: TextObject | Expando, options = { timeout: 250 }): TLStore => {
  const automerge = data instanceof TypedObject;
  const [adapter] = useState(() => (automerge ? new AutomergeStoreAdapter(options) : new YjsStoreAdapter(options)));

  useEffect(() => {
    adapter.open((automerge ? getRawDoc(data, ['content']) : data) as any);
    return () => {
      // TODO(burdon): Throws error if still mounted.
      // adapter.close();
    };
  }, [data]);

  return adapter.store;
};
