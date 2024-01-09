//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useClient, PublicKey } from '@dxos/react-client';

const Component = () => {
  // requires <ClientProvider/> somewhere in the tree
  const client = useClient();

  return (
    <div
      onClick={async () => {
        // open the profile panel
        await client.shell.open();

        // join another device using an invitation
        const { identity: id1 } = await client.shell.initializeIdentity({
          invitationCode: '<device invitation code>',
        });

        // open the identity creation flow
        const { identity: id2, cancelled } =
          await client.shell.initializeIdentity();

        // invite a new device to join the current identity
        const { device } = await client.shell.shareIdentity();

        // invite new members to join a space
        const { members } = await client.shell.shareSpace({
          spaceKey: PublicKey.from('<space key>'),
        });

        // join an existing space
        const { space } = await client.shell.joinSpace({
          invitationCode: '<invitation code>',
        });
      }}
    ></div>
  );
};
