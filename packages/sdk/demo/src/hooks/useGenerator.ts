//
// Copyright 2020 DXOS.org
//

import { useState } from 'react';

import { InvitationDescriptor, Party } from '@dxos/echo-db';
import { Generator } from '@dxos/echo-testing';
import { useClient } from '@dxos/react-client';

/**
 * This is a poor abstraction -- remove it with util functions.
 * @deprecated
 */
export const useGenerator = () => {
  const client = useClient();

  const [party, setParty] = useState<Party | undefined>();
  const [generator, setGenerator] = useState<Generator | undefined>();

  const createParty = async (config = {}) => {
    const party = await client.echo.createParty();

    const generator = new Generator(party.database, { seed: 1 });
    await generator.generate(config);

    setGenerator(generator);
    setParty(party);
  };

  const joinParty = async (invitation: string) => {
    const party = await client.echo.joinParty(
      InvitationDescriptor.fromQueryParameters(JSON.parse(invitation)), async () => Buffer.from('0000')
    );
    await party.open();

    setGenerator(new Generator(party.database, { seed: 1 }));
    setParty(party);
  };

  return { party, database: generator?.database, generator, createParty, joinParty };
};
