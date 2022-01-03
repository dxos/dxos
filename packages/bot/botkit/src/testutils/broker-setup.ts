//
// Copyright 2021 DXOS.org
//

import { Awaited } from '@dxos/async';
import { Config, ConfigObject } from '@dxos/config';
import { createTestBroker } from '@dxos/signal';
import { randomInt } from '@dxos/util';

export interface BrokerSetup {
  broker: Awaited<ReturnType<typeof createTestBroker>>,
  config: Config
}

export const setupBroker: () => Promise<BrokerSetup> = async () => {
  const port = randomInt(40000, 10000);
  const broker = await createTestBroker(port);
  const config = new Config<ConfigObject>({
    services: {
      signal: {
        server: `ws://localhost:${port}`
      }
    }
  });

  return {
    broker,
    config
  };
};
