//
// Copyright 2021 DXOS.org
//

import { Awaited } from '@dxos/async';
import type { defs } from '@dxos/config';
import { createTestBroker } from '@dxos/signal';
import { randomInt } from '@dxos/util';

export interface BrokerSetup {
  broker: Awaited<ReturnType<typeof createTestBroker>>,
  config: defs.Config
}

export const setupBroker: () => Promise<BrokerSetup> = async () => {
  const port = randomInt(40000, 10000);
  const broker = await createTestBroker(port);

  return {
    broker,
    config: {
      services: {
        signal: {
          server: `ws://localhost:${port}`
        }
      }
    }
  };
};
