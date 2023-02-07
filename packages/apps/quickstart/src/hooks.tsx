//
// Copyright 2023 DXOS.org
//
import { useEffect, useState } from 'react';

import { useClient, useSpaces } from '@dxos/react-client';


export const useDefaultSpace = () => {
  const spaces = useSpaces();
  const client = useClient();
  const [space, setSpace] = useState(spaces?.[0]);
  
  return space;
};
