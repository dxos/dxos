//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { InvitationDescriptor, Party } from '@dxos/echo-db';
import { Generator } from '@dxos/echo-testing';
import { useClient, ClientInitializer, ProfileInitializer, useProfile } from '@dxos/react-client';

import { ONLINE_CONFIG } from '../../src';
import Main from './Main';
import StartDialog from './StartDialog';

/**
 * Simple demo.
 * @constructor
 */
export const Primary = () => {
  const Story = () => {
    const client = useClient();
    const profile = useProfile();
    const [party, setParty] = useState<Party>();

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
    <ClientInitializer>
      <ProfileInitializer>
        <Story/>
      </ProfileInitializer>
    </ClientInitializer>
  );
};

/**
 * Enables shared parties and replication.
 * @constructor
 */
export const Peers = () => {
  const code = '0000';

  const Root = () => {
    const client = useClient();
    const [party, setParty] = useState<Party>();

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

    const handleJoinParty = async (invitationCode: string) => {
      const party = await client.echo.joinParty(
        InvitationDescriptor.fromQueryParameters(JSON.parse(invitationCode)), async () => Buffer.from(code)
      );

      await party.open();
      setParty(party);
    };

    if (party) {
      return (
        <Main party={party} code={code} />
      );
    }

    return (
      <StartDialog onCreate={handleCreateParty} onJoin={handleJoinParty} />
    );
  };

  return (
    <ClientInitializer config={ONLINE_CONFIG}>
      <ProfileInitializer>
        <Root/>
      </ProfileInitializer>
    </ClientInitializer>
  );
};

export default {
  title: 'Demo',
  component: Primary
};
