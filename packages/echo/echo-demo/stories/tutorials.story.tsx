//
// Copyright 2021 DXOS.org
//

import { Client } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';
import { ClientProvider, useClient, useParties, useParty, useProfile } from '@dxos/react-client';
import { Button } from '@material-ui/core';
import { withKnobs } from '@storybook/addon-knobs';
import React, {useState, useEffect} from 'react';
import faker from 'faker';
import { ClientInitializer } from './ClientInitializer';

export default {
  title: 'Tutorials',
  decorators: [withKnobs]
};

const Stage1Consumer = () => {
  const client = useClient();
  const profile = useProfile();

  const handleCreateProfile = async () => {
    await client.createProfile({...createKeyPair(), username: faker.name.firstName()})
  }

  if (!profile?.username) {
    return (
      <Button variant="contained" onClick={handleCreateProfile}>Create profile</Button>
    )
  }
  
  return (
    <p>Welcome, {profile.username}</p>
  )
}

const Stage2Consumer = () => {
  const client = useClient();
  const profile = useProfile();
  const parties = useParties()

  const handleCreateProfile = async () => {
    await client.createProfile({...createKeyPair(), username: faker.name.firstName()})
  }

  const handleCreateParty = async () => {
    const party = await client.echo.createParty();
    await party.setTitle(faker.company.companyName())
  }

  if (!profile?.username) {
    return (
      <Button variant="contained" onClick={handleCreateProfile}>Create profile</Button>
    )
  }
  
  return (<>
    <p>Welcome, {profile.username}</p>
    {parties?.length ? (
      <ul>
        {parties.map(party => (
          <li key={party.key.toHex()}>{party.title ?? party.key.toHex()}</li>
        ))}
      </ul>
    ) : null}
    <Button variant="contained" onClick={handleCreateParty}>Create party</Button>
  </>)
}

export const Stage1 = () => {
  return (<>
    <h3>Uses Client</h3>
    <ClientInitializer>
      <Stage1Consumer/>
    </ClientInitializer>
  </>);
};

export const Stage2 = () => {
  return (<>
    <h3>Creates a party</h3>
    <ClientInitializer>
      <Stage2Consumer/>
    </ClientInitializer>
  </>);
};

export const Stage3 = () => {
  return (<>
    <h3>Adds items to parties</h3>
    <div>Stage3</div>
  </>);
};
