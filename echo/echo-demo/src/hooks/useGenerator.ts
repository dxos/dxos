//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { createTestInstance } from '@dxos/echo-db';
import { Generator } from '@dxos/echo-testing';

export const useGenerator = (config = {}) => {
  const [generator, setGenerator] = useState<Generator | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const echo = await createTestInstance({ initialize: true });
      const party = await echo.createParty();
      setGenerator(new Generator(party.database, { seed: 1 }));
    });
  }, []);

  useEffect(() => {
    if (generator) {
      setImmediate(async () => {
        await generator.generate(config);
      });
    }
  }, [generator]);

  return generator;
};
