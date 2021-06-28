//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { JsonTreeView } from '@dxos/react-ux';

import { useExtensionToBackground } from '../hooks';

const Application = () => {
  const [profile, setProfile] = useState<any | undefined>(undefined);
  const [parties] = useState<any[] | undefined>(undefined);
  const backgroundService = useExtensionToBackground();

  useEffect(() => {
    if (backgroundService === undefined) {
      return;
    }

    setImmediate(async () => {
      const response = await backgroundService.rpc.GetProfile({});
      setProfile(response);
    });

    // const partiesListener = (message: Uint8Array) => {
    //   const parties = schema.getCodecForType('dxos.wallet.extension.GetPartiesResponse').decode(message);
    //   setParties(parties.partyKeys);
    // };

    // const responseStream = rpcClient.callAndSubscribe('GetParties', getPartiesRequest);
    // responseStream.message.on(partiesListener);
    // return () => responseStream.message.off(partiesListener);
  }, [backgroundService]);

  if (!backgroundService) {
    return <p>Connecting to background...</p>;
  }

  if (!profile) {
    return <p>No profile loaded.</p>;
  }

  const handleCreateParty = async () => {
    const response = await backgroundService.rpc.CreateParty({});
    console.log('Created party: ', response.partyKey);
  };

  return (
    <div style={{ minWidth: 400 }}>
      <JsonTreeView data={profile} />
      <p>Number of parties: {parties?.length ?? 0}.</p>
      <button onClick={handleCreateParty}>Create party</button>
    </div>
  );
};

export default Application;
