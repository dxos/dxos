//
// Copyright 2020 DXOS.org
//

import { useState } from 'react';

import { InvitationDescriptor, Party } from '@dxos/echo-db';
import { Generator } from '@dxos/echo-testing';

import { createOnlineInstance } from '../config/config';

// TODO(burdon): Break apart.
export const useGenerator = () => {
  const [party, setParty] = useState<Party | undefined>();
  const [generator, setGenerator] = useState<Generator | undefined>();

  const createParty = async (config = {}) => {
    const echo = await createOnlineInstance();

    const party = await echo.createParty();

    const generator = new Generator(party.database, { seed: 1 });
    await generator.generate(config);

    setGenerator(generator);
    setParty(party);
  };

  const joinParty = async (invitation: string) => {
    console.debug('Joining...');
    const echo = await createOnlineInstance();

    const party = await echo.joinParty(
      InvitationDescriptor.fromQueryParameters(JSON.parse(invitation)), async () => Buffer.from('0000'));
    await party.open();
    console.debug('Open', party);

    setGenerator(new Generator(party.database, { seed: 1 }));
    setParty(party);
  };

  return { party, generator, createParty, joinParty };
};
