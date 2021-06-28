//
// Copyright 2020 DXOS.org
//

import React from 'react';
// import { useRpcClient, schema, GetProfileResponse } from '@dxos/wallet-core';

// const getProfileRequest = schema.getCodecForType('dxos.wallet.extension.GetProfileRequest').encode({})

const App = () => {
  // const [profile, setProfile] = useState<GetProfileResponse | undefined>(undefined);
  // const rpcClient = useRpcClient();

  // useEffect(() => {
  //   if (rpcClient === undefined) {
  //     return;
  //   }

  //   setImmediate(async () => {
  //     const response = await rpcClient.call('GetProfile', getProfileRequest);
  //     const profile = schema.getCodecForType('dxos.wallet.extension.GetProfileResponse').decode(response);
  //     setProfile(profile);
  //   });
  // }, [rpcClient]);

  // if (!rpcClient) {
  //   return <p>Connecting to the DXOS Wallet Extension...</p>;
  // }

  // if (!profile) {
  //   return <p>No profile loaded.</p>;
  // }

  // return (
  //   <div style={{ minWidth: 400 }}>
  //     <p>Hello, {profile.username ?? profile.publicKey}</p>
  //   </div>
  // );

  return <div> Hello world! </div>;
};

export default App;
