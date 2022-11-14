//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

import { SpaceSerializer } from '@dxos/client';
import { useClient } from '@dxos/react-client';

export const useSpaceSerializer = () => {
  const client = useClient();
  const serializer = useMemo(() => new SpaceSerializer(client), []);
  return serializer;
};
