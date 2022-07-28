//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

import { NewSignalClient } from './signal/new-client';

const main = async () => {
  const client = new NewSignalClient('wss://pcarrier.gh.srv.us/ws');

  await client.open();

  const swarm = PublicKey.random();
  const peerId1 = PublicKey.fromHex('0x11111111111111111111111111');
  // const peerId2 = PublicKey.fromHex('0x22222222222222222222222222')
  const events = client.join(swarm, peerId1);

  console.log('foo');

  events.subscribe(event => {
    console.log({ event });
  });
  //   client.join(topic, peerId2),
  // ])
};

main().then(() => {}).catch(console.error);
