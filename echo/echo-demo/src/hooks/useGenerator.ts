//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { createTestInstance, InvitationDescriptor } from '@dxos/echo-db';
import { Generator } from '@dxos/echo-testing';

export const useGenerator = () => {
  const [generator, setGenerator] = useState<Generator | undefined>();

  async function generate(config = {}) {
    const echo = await createTestInstance({ initialize: true });
    const party = await echo.createParty();
    const generator = new Generator(party.database, { seed: 1 });
    await generator.generate(config);
    setGenerator(generator);
  }

  async function join(invitation: string) {
    const echo = await createTestInstance({ initialize: true });
    const party = await echo.joinParty(
      InvitationDescriptor.fromQueryParameters(JSON.parse(invitation)), async () => Buffer.from('0000'));
    await party.open();
    setGenerator(new Generator(party.database, { seed: 1 }));
  }

  return { generator, generate, join };
};
