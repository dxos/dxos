//
// Copyright 2021 DXOS.org
//

import { withKnobs } from '@storybook/addon-knobs';
import faker from 'faker';
import React from 'react';

import { Button } from '@material-ui/core';

import { createKeyPair } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { useClient, useItems, useParties, useProfile } from '@dxos/react-client';

import { ClientInitializer } from './story-components/ClientInitializer';

export default {
  title: 'Tutorials',
  decorators: [withKnobs]
};

const Stage1Consumer = () => {
  const client = useClient();
  const profile = useProfile();

  const handleCreateProfile = async () => {
    await client.createProfile({ ...createKeyPair(), username: faker.name.firstName() });
  };

  if (!profile?.username) {
    return (
      <Button variant="contained" onClick={handleCreateProfile}>Create profile</Button>
    );
  }

  return (
    <p>Welcome, {profile.username}</p>
  );
};

const PartyTitle = ({ party }: {party: Party}) => {
  return <>{party.title ?? party.key.toHex()}</>;
};

const PartyItemCount = ({ party }: {party: Party}) => {
  const items = useItems({ partyKey: party.key });
  return <><PartyTitle party={party}/> has {items.length} items.</>;
};

interface Stage2ConsumerProps {
  PartyDetails?: ({ party: Party }) => JSX.Element
}

const Stage2Consumer = ({ PartyDetails = PartyTitle }: Stage2ConsumerProps) => {
  const client = useClient();
  const profile = useProfile();
  const parties = useParties();

  const handleCreateParty = async () => {
    const party = await client.echo.createParty();
    await party.setTitle(faker.company.companyName());
  };

  if (!profile?.username) {
    return null;
  }

  return (<>
    {parties?.length ? (
      <ul>
        {parties.map(party => (
          <li key={party.key.toHex()}><PartyDetails party={party}/></li>
        ))}
      </ul>
    ) : null}
    <Button variant="contained" onClick={handleCreateParty}>Create party</Button>
  </>);
};

const Stage3Consumer = () => {
  const parties = useParties();

  const handleCreateItem = async (party: Party) => {
    await party.database.createItem({ model: ObjectModel });
  };

  return (<>
    <ul>
      {parties?.map(party => (<>
        <li>
          {party.title ?? party.key.toHex()}
          <Button variant="text" onClick={() => handleCreateItem(party)}>Add item</Button>
        </li>
      </>))}
    </ul>

  </>);
};

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
      <Stage1Consumer/>
      <Stage2Consumer/>
    </ClientInitializer>
  </>);
};

export const Stage3 = () => {
  return (<>
    <h3>Adds items to parties</h3>
    <ClientInitializer>
      <Stage1Consumer/>
      <Stage2Consumer PartyDetails={PartyItemCount}/>
      <Stage3Consumer />
    </ClientInitializer>
  </>);
};
