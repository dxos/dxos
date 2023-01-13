//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

import { useClient } from '@dxos/react-client';

export const useSpaceSerializer = () => {
  const client = useClient();
  return useMemo(() => client.createSerializer(), []);
};
