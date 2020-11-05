//
// Copyright 2020 DXOS.org
//

import { createTestInstance } from '@dxos/echo-db';

export const createECHO = async (options = {}) => {
  const echo = await createTestInstance({ ...options });
  return { echo };
};
