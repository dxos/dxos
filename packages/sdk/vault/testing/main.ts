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

  (window as any).acceptInvitation = async (invitation: string) => {
    const inv = await client.echo.acceptInvitation(InvitationDescriptor.fromQueryParameters(JSON.parse(invitation)))
    console.log(await inv.getParty())
  }

  (window as any).createInvitation = async () => {
    const party = await client.echo.createParty()
    const inv = await party.createInvitation()
    inv.error.on(console.error)
    console.log(JSON.stringify(inv.descriptor.toQueryParameters()))
  }
})();
