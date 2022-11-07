//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { failUndefined, raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { BotService } from '@dxos/protocols/proto/dxos/service/scheduler';

import { BotRPCPeer } from './bot-rpc-peer';

const main = async () => {
  const wsEndpoint = process.env.WS_ENDPOINT ?? raise(new Error('WS_ENDPOINT is not set'));

  const botService: BotService = {
    call: () => {
      return raise(new Error('Not implemented'));
    },

    healthcheck: async () => {}
  };

  const rpc = new BotRPCPeer(wsEndpoint, botService);
  await rpc.connected.waitForCount(1);

  log('Before get config');

  const botConfig = await rpc.rpc.getConfig();
  log('Received bot config', JSON.stringify(botConfig));
  // assert(botConfig.spec.invitation['@type'] as keyof TYPES === 'dxos.echo.invitations.InvitationEncoder');

  const client = new Client({ config: botConfig.clientConfig });
  await client.initialize();
  log('Initialized');

  if (!client.halo.profile) {
    await client.halo.createProfile();
  }
  log('Created profile');

  // if (!client.echo.getParty(PublicKey.from(botConfig.spec.partyKey))) {
  //   await client.echo.acceptInvitation(
  //     InvitationEncoder.fromProto(botConfig.spec.invitation)
  //   );
  // }

  const profile = client.halo.profile ?? failUndefined();
  // const party = client.echo.getParty(PublicKey.from(botConfig.spec.partyKey));

  log('Before send report');
  await rpc.rpc.sendReport({
    identityKey: profile.publicKey.asUint8Array()
  });
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
