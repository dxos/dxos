//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { createTestInstance, InvitationDescriptor, Party } from '@dxos/echo-db';
import { Generator } from '@dxos/echo-testing';

const createInstance = () => createTestInstance({
  initialize: true,
  networkManagerOptions: {
    signal: ['wss://apollo1.kube.moon.dxos.network/dxos/signal'],
    ice: [{ urls: 'turn:apollo1.kube.moon.dxos.network:3478', username: 'dxos', credential: 'dxos' }]
  }
});

export const useGenerator = () => {
  const [generator, setGenerator] = useState<Generator | undefined>();
  const [party, setParty] = useState<Party | undefined>()

  async function generate(config = {}) {
    const echo = await createInstance()
    const party = await echo.createParty();
    const generator = new Generator(party.database, { seed: 1 });
    await generator.generate(config);
    setGenerator(generator);
    setParty(party);
  }

  async function join(invitation: string) {
    const echo = await createInstance()
    const party = await echo.joinParty(
      InvitationDescriptor.fromQueryParameters(JSON.parse(invitation)), async () => Buffer.from('0000'));
    await party.open();
    setGenerator(new Generator(party.database, { seed: 1 }));
    setParty(party);
  }

  return { generator, party, generate, join };
};
