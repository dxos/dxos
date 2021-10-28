//
// Copyright 2021 DXOS.org
//

import { useState } from 'react';

import { trigger } from '@dxos/async';

export const useSecretProvider = <T extends any> (): [() => Promise<T>, (value: T) => void] => {
  const [[provider, resolver]] = useState(() => trigger<T>());

  return [provider, resolver];
};
