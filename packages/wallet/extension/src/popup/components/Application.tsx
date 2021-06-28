//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { JsonTreeView } from '@dxos/react-ux';

import { useExtensionBackgroundService } from '../hooks';

const Application = () => {
  const [profile, setProfile] = useState<any | undefined>(undefined);
  const [parties] = useState<any[] | undefined>(undefined);
  const backgroundService = useExtensionBackgroundService();

  useEffect(() => {
    if (backgroundService === undefined) {
      return;
    }

    setImmediate(async () => {
      const response = await backgroundService.rpc.GetProfile({});
      setProfile(response);
    });
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
