//
// Copyright 2022 DXOS.org
//

import { createTestBroker } from '@dxos/signal';

export const setup = async () => {
  await createTestBroker(4000);
};
