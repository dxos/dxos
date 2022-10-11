//
// Copyright 2022 DXOS.org
//

import React, { createContext, PropsWithChildren, useMemo, useState, useEffect, useContext } from 'react';

import { Party } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { Loading } from '@dxos/react-ui';

export interface PartyContextValue {
  party?: Party
}

export const PartyContext = createContext<PartyContextValue>({});

export const PartyProvider = (props: PropsWithChildren<{}>) => {
  const client = useClient();
  const [party, setParty] = useState<Party>();

  useEffect(() => {
    if (!party) {
      void client.echo.createParty().then(party => setParty(party));
    }
  }, [client, party]);

  const partyContextValue = useMemo<PartyContextValue>(() => ({ party }), [party]);

  return (
  <PartyContext.Provider value={partyContextValue}>
    {party ? props.children : <Loading />}
  </PartyContext.Provider>
  );
};

export const useParty = () => useContext(PartyContext);
