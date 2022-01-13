//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { PartyProxy, decodeInvitation } from '@dxos/client';
import { Party } from '@dxos/echo-db';
import { Generator } from '@dxos/echo-testing';
import { ClientProvider, ProfileInitializer, useClient, useProfile } from '@dxos/react-client';

import { ONLINE_CONFIG, StartDialog } from '../src';
import { Main } from './helpers';

export default {
  title: 'demos/views'
};

/**
 * Simple demo.
 * @constructor
 */
export const Primary = () => {
  const Story = () => {
    const client = useClient();
    const profile = useProfile();
    const [party, setParty] = useState<PartyProxy>();

    useEffect(() => {
      if (profile) {
        setImmediate(async () => {
          const party = await client.echo.createParty();
          setParty(party);
        });
      }
    }, [profile]);

    if (!party) {
      return null;
    }

    return (
      <Main party={party} />
    );
  };

  return (
    <ClientProvider>
      <ProfileInitializer>
        <Story />
      </ProfileInitializer>
    </ClientProvider>
  );
};

/**
 * Enables shared parties and replication.
 * @constructor
 */
export const Peers = () => {
  const Root = () => {
    const client = useClient();
    const [party, setParty] = useState<PartyProxy | Party>();

    const handleCreateParty = async () => {
      const party = await client.echo.createParty();
      const generator = new Generator(party.database, { seed: 1 });
      await generator.generate({
        numOrgs: 4,
        numPeople: 16,
        numProjects: 6
      });

      setParty(party);
    };

    const handleJoinParty = async (invitationText: string) => {
      const { encodedInvitation, secret } = JSON.parse(invitationText);
      const invitation = client.echo.acceptInvitation(decodeInvitation(encodedInvitation));
      invitation.authenticate(Buffer.from(secret));
      const party = await invitation.wait();
      setParty(party);
    };

    if (party) {
      return (
        <Main party={party} showInvitation />
      );
    }

    return (
      <StartDialog onCreate={handleCreateParty} onJoin={handleJoinParty} />
    );
  };

  return (
    <ClientProvider config={ONLINE_CONFIG}>
      <ProfileInitializer>
        <Root />
      </ProfileInitializer>
    </ClientProvider>
  );
};
