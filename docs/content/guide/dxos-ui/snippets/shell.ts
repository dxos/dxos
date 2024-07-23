//
// Copyright 2023 DXOS.org
//

import { Client, PublicKey } from '@dxos/client';

const client = new Client();
await client.initialize();

// open the profile panel
await client.shell.open();

// open the identity creation flow
const { identity: id2, cancelled } = await client.shell.createIdentity();

// join another device using an invitation
const { identity: id1 } = await client.shell.joinIdentity({
  invitationCode: '<device invitation code>',
});

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
