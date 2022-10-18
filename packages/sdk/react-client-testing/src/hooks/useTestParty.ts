//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { useEffect, useMemo, useState } from 'react';

import { Party } from '@dxos/client';
import { PartyBuilder, buildTestParty } from '@dxos/client-testing';
import { useClient } from '@dxos/react-client';

type TestPartyCallback = (builder: PartyBuilder) => Promise<void>;

/**
 * Generate test party.
 */
export const useTestParty = (callback: TestPartyCallback = buildTestParty): Party | undefined => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const builder = usePartyBuilder(party);

  useEffect(() => {
    setTimeout(async () => {
      // TODO(burdon): Use PartyBuidler.
      const party = await client.echo.createParty();
      await party.setTitle(faker.lorem.word());
      setParty(party);
    });
  }, []);

  useEffect(() => {
    if (builder) {
      setTimeout(async () => {
        await callback(builder);
      });
    }
  }, [builder, party]);

  return party;
};

/**
 * @param party
 */
export const usePartyBuilder = (party?: Party) => useMemo(() => party ? new PartyBuilder(party) : undefined, [party?.key.toHex()]);
