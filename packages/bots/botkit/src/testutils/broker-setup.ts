//
// Copyright 2021 DXOS.org
//

import { Awaited } from '@dxos/async';
import { Config } from '@dxos/config';
import { createTestBroker } from '@dxos/signal';
import { randomInt } from '@dxos/util';

export interface BrokerSetup {
  broker: Awaited<ReturnType<typeof createTestBroker>>;
  config: Config;
}

export const setupBroker: () => Promise<BrokerSetup> = async () => {
  const port = randomInt(40000, 10000);
  const broker = await createTestBroker(port);
  const config = new Config({
    version: 1,
    runtime: {
      services: {
        signal: {
          server: broker.url()
        }
      }
    }
  });

  return {
    broker,
    config
  };
};
