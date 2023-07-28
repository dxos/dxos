//
// Copyright 2023 DXOS.org
//

import { afterTest, test } from '@dxos/test';

import { Client } from '../client';
import { fromAgent } from './agent';

// Requires running CLI daemon
test.skip('connect to local CLI', async () => {
  const client = new Client({ services: fromAgent() });
  await client.initialize();
  afterTest(() => client.destroy());

  // await client.halo.createIdentity({ name: 'test' });
  console.log({ identity: client.halo.identity.get() });

  // const invitation = client.acceptInvitation(InvitationEncoder.decode('4ZxWyOpQ3b51vdr9azhGPnGqazqS9sLKIn45jHfNukf2AJk8x7Ny2iy62gfZSdouObK7RRSki54UlSx4VWg9J5JyC0gr1qMgpOmgUUTiBtxROe1lr3CsSRKkRBz1fhC68hWyf5TN2yLIcoMZuqYoFZ0L0'))
  // invitation.subscribe(state => {
  //   switch(state.state) {
  //     case Invitation.State.SUCCESS:
  //       console.log('SUCCESS')
  //   }
  // })

  console.log({
    spaces: client.spaces.get(),
  });

  const space = client.spaces.get()[0];
  await space.waitUntilReady();

  const { objects } = space.db.query({});
  console.log(objects.length);

  await new Promise(() => {});
});
