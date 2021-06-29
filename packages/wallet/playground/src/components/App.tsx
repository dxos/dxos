//
// Copyright 2020 DXOS.org
//

import React, {useState, useEffect} from 'react';
import { useRpcClient, schema, GetProfileResponse } from '@dxos/wallet-core';
import { useContentScript } from '../hooks';

const getProfileRequest = schema.getCodecForType('dxos.wallet.extension.GetProfileRequest').encode({})

const App = () => {
  const [profile, setProfile] = useState<GetProfileResponse | undefined>(undefined);
  const contentScript = useContentScript();
  const rpcClient = contentScript?.rpc;

  useEffect(() => {
    if (rpcClient === undefined) {
      return;
    }

    setImmediate(async () => {
      setProfile(await rpcClient.GetProfile({}));
    });
  }, [rpcClient]);

  if (!rpcClient) {
    return <p>Connecting to the DXOS Wallet Extension...</p>;
  }

  if (!profile) {
    return <p>No profile loaded.</p>;
  }

  return (
    <div style={{ minWidth: 400 }}>
      <p>Hello, {profile.username ?? profile.publicKey}</p>
    </div>
  );
};

export default App;
