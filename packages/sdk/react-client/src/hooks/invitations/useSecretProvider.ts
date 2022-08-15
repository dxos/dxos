//
// Copyright 2021 DXOS.org
//

import { useState } from 'react';

import { trigger } from '@dxos/async';

type Provider<T> = () => Promise<T>
type Resolver<T> = (value: T) => void
type Reset = () => void

export const useSecretProvider = <T> (): [Provider<T>, Resolver<T>, Reset] => {
  const [[provider, resolver], setState] = useState(() => trigger<T>());
  const reset = () => setState(() => trigger<T>());
  return [provider, resolver, reset];
};
