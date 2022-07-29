//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';
import { createTestBroker } from '@dxos/signal';

import { NewSignalClient } from './signal/new-client';

const main = async () => {
  const broker = createTestBroker();
  const client = new NewSignalClient(broker.url());

  console.log(1);
  await client.open();

  console.log(2);
  const swarm = PublicKey.random();
  const peerId1 = PublicKey.fromHex('0x11111111111111111111111111');
  const peerId2 = PublicKey.fromHex('0x22222222222222222222222222')
  const events1 = client.join(swarm, peerId1);
  const events2 = client.join(swarm, peerId2);

  console.log('foo');

  events1.subscribe(event => {
    console.log({ event });
  });
  console.log('bar');

  //   client.join(topic, peerId2),
  // ])
  broker.stop();
};

main();
