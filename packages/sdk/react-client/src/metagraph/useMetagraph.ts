//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { Metagraph } from '@dxos/metagraph';

import { useConfig } from '../client';

/**
 * Retrieve a configured metagraph object.
 */
export const useMetagraph = () => {
  const config = useConfig();
  const [metagraph, setMetagraph] = useState<Metagraph>();
  useEffect(() => {
    const metagraph = new Metagraph(config);
    setMetagraph(metagraph);
  }, [config]);

  return metagraph;
};
