import React, { useState, useEffect } from 'react';
import { hot } from 'react-hot-loader';
import logo from '@assets/images/dxos.png';
import {createKeyPair} from '@dxos/crypto'
import {ClientProvider, useClient, useProfile} from '@dxos/react-client'
import {Client} from '@dxos/client'

export const Home = () => {
  const client = useClient();
  const profile = useProfile();

  const handleCreateProfile = async () => {
    await client.createProfile({ ...createKeyPair(), username: 'DXOS User' });
  };

  return (
    <>
      <button disabled={!!profile} onClick={handleCreateProfile}>Create HALO</button>
      {!!profile && <p>{JSON.stringify(profile)}</p>}
    </>
  );
};

export default Home;
