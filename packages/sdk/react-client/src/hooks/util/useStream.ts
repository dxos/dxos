//
// Copyright 2021 DXOS.org
//

import { DependencyList, useState, useEffect } from 'react';

import { Stream } from '@dxos/codec-protobuf';

/**
 * Subscribe to service API streams.
 */
export const useStream = <T>(streamFactory: () => Stream<T>, defaultValue: T, deps: DependencyList = []): T => {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  useEffect(() => {
    const stream = streamFactory();
    stream.subscribe((response: T) => setValue(response));
    return () => stream.close();
  }, deps);

  return value ?? defaultValue;
};
