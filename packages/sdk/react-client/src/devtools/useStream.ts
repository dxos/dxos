//
// Copyright 2021 DXOS.org
//

import { type DependencyList, useEffect, useState } from 'react';

import { type Stream } from '@dxos/codec-protobuf/stream';
import { log } from '@dxos/log';

/**
 * Subscribe to service API streams.
 */
export const useStream = <T>(streamFactory: () => Stream<T>, defaultValue: T, deps: DependencyList = []): T => {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  useEffect(() => {
    const stream = streamFactory();
    stream.subscribe(
      (response: T) => setValue(response),
      (err) => {
        if (err) {
          log.catch(err);
        }
      },
    );

    return () => {
      void stream.close();
    };
  }, deps);

  return value ?? defaultValue;
};
