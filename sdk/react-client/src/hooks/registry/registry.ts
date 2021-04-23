//
// Copyright 2020 DXOS.org
//

import { useClient } from '../client';

export const useRegistry = () => {
  const { registry } = useClient();
  if (!registry) {
    console.warn('Registry not configured.');
  }

  return registry;
};
