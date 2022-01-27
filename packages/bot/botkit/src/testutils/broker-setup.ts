//
// Copyright 2021 DXOS.org
//

import { Awaited } from '@dxos/async';
import { Config, ConfigV1Object } from '@dxos/config';
import { createTestBroker } from '@dxos/signal';
import { randomInt } from '@dxos/util';

export interface BrokerSetup {
  broker: Awaited<ReturnType<typeof createTestBroker>>,
  config: Config
}

export const setupBroker: () => Promise<BrokerSetup> = async () => {
  const port = randomInt(40000, 10000);
  const broker = await createTestBroker(port);
  const config = new Config<ConfigV1Object>({
    runtime: {
      services: {
        signal: {
          server: `ws://localhost:${port}`
        }
      }
    }
  });

  return {
    broker,
    config
  };
};
