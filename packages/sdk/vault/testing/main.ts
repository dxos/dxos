//
// Copyright 2022 DXOS.org
//

import { Client, InvitationDescriptor } from '@dxos/client';

void (async () => {
  const client = new Client({ runtime: { client: { mode: 2 /* remote */ } } });
  await client.initialize();

  if (!client.halo.profile) {
    await client.halo.createProfile();
  }

  console.log(client.info);

  (window as any).dxos = client;

  (window as any).acceptInvitation = async (invitation: any) => {
    console.log(await client.echo.acceptInvitation(InvitationDescriptor.fromQueryParameters(invitation)));
  }
})();
.