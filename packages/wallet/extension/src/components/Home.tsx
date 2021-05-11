import React from 'react';
import {createKeyPair} from '@dxos/crypto'
import {useClient, useProfile} from '@dxos/react-client'

export const Home = () => {
  const client = useClient();
  const profile = useProfile();

  const handleCreateProfile = async () => {
    await client.createProfile({ ...createKeyPair(), username: 'DXOS User' });
  };

  return (
    <>
      <button disabled={!!profile} onClick={handleCreateProfile}>Create HALO</button>
      {!!profile && <p>Welcome, {profile.username}</p>}
    </>
  );
};

export default Home;
