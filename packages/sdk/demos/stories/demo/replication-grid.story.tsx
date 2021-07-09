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

export const ReplicationGrid = () => {
  const code = '0000';

  const Root = () => {
    const client = useClient();
    const [party, setParty] = useState<Party>();

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
      <StartDialog onCreate={() => window.alert('Not supported in this demo.')} onJoin={handleJoinParty} />
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
  component: ReplicationGrid
};
