//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { JsonTreeView } from '@dxos/react-ux';

import { schema } from '../../proto/gen';
import { useRpcClient } from '../hooks';

const getProfileRequest = schema.getCodecForType('dxos.wallet.extension.GetProfileRequest').encode({});
const getPartiesRequest = schema.getCodecForType('dxos.wallet.extension.GetPartiesRequest').encode({});
const createPartyRequest = schema.getCodecForType('dxos.wallet.extension.CreatePartyRequest').encode({});

const Application = () => {
  const [profile, setProfile] = useState<any | undefined>(undefined);
  const [parties, setParties] = useState<any[] | undefined>(undefined);
  const rpcClient = useRpcClient();

  useEffect(() => {
    if (rpcClient === undefined) {
      return;
    }

    setImmediate(async () => {
      const response = await rpcClient.call('GetProfile', getProfileRequest);
      const profile = schema.getCodecForType('dxos.wallet.extension.GetProfileResponse').decode(response);
      setProfile(profile);
    });
  }, [rpcClient]);

  if (!profile) {
    return <p>No profile loaded.</p>;
  }

  if (!rpcClient) {
    return <p>Connecting to background...</p>;
  }

  const handleRefresh = async () => {
    const response = await rpcClient.call('GetParties', getPartiesRequest);
    const parties = schema.getCodecForType('dxos.wallet.extension.GetPartiesResponse').decode(response);
    setParties(parties.partyKeys);
  };

  const handleCreateParty = async () => {
    const response = await rpcClient.call('CreateParty', createPartyRequest);
    const party = schema.getCodecForType('dxos.wallet.extension.CreatePartyResponse').decode(response);
    console.log('Created party: ', party.partyKey);
    handleRefresh();
  };

  return (
    <div style={{ minWidth: 400 }}>
      <JsonTreeView data={profile} />
      <p>Number of parties: {parties?.length ?? 0}.</p>
      <button onClick={handleCreateParty}>Create party</button>
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  );
};

export default Application;
