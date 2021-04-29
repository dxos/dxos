//
// Copyright 2020 DXOS.org
//

import { useState } from 'react';

import { createTestInstance, InvitationDescriptor, Party } from '@dxos/echo-db';
import { Generator } from '@dxos/echo-testing';

// TODO(burdon): Factor out config.
const createInstance = () => createTestInstance({
  initialize: true,
  networkManagerOptions: {
    signal: ['wss://apollo1.kube.moon.dxos.network/dxos/signal'],
    ice: [{ urls: 'turn:apollo1.kube.moon.dxos.network:3478', username: 'dxos', credential: 'dxos' }]
  }
});

// TODO(burdon): Break apart.
export const useGenerator = () => {
  const [party, setParty] = useState<Party | undefined>();
  const [generator, setGenerator] = useState<Generator | undefined>();

  const createParty = async (config = {}) => {
    const echo = await createInstance();

    const party = await echo.createParty();

    const generator = new Generator(party.database, { seed: 1 });
    await generator.generate(config);

    setGenerator(generator);
    setParty(party);
  };

  const joinParty = async (invitation: string) => {
    console.log('Joining...');
    const echo = await createInstance();

    const party = await echo.joinParty(
      InvitationDescriptor.fromQueryParameters(JSON.parse(invitation)), async () => Buffer.from('0000'));
    await party.open();
    console.log('Open', party);

    setGenerator(new Generator(party.database, { seed: 1 }));
    setParty(party);
  };

  return { party, generator, createParty, joinParty };
};
