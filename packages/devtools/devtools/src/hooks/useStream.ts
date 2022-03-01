//
// Copyright 2021 DXOS.org
//

import { DependencyList, useState, useEffect } from 'react';

import { Stream } from '@dxos/codec-protobuf';

export const useStream = <T>(streamFactory: () => Stream<T>, deps: DependencyList = []): T | undefined => {
  const [value, setValue] = useState<T | undefined>();

  useEffect(() => {
    const stream = streamFactory();
    stream.subscribe(msg => {
      setValue(msg);
    }, () => {});

    return () => stream.close();
  }, deps);

  return value;
};
