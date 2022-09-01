import { failUndefined, raise } from '@dxos/debug'
import { Client, InvitationDescriptor } from '@dxos/client';
import { Stream } from 'stream';
import { BotRPCPeer } from './bot-rpc-peer';
import { schema, TYPES } from './proto/gen';
import { BotService, Reply } from './proto/gen/dxos/bot';
import assert from 'assert'
import { PublicKey } from 'packages/common/protocols/dist/src';


async function main() {
  const wsEndpoint = process.env.WS_ENDPOINT ?? raise(new Error('WS_ENDPOINT is not set'));

  const botService: BotService = {
    call: () => {
      return raise(new Error('Not implemented'));
    },

    healthcheck: async () => {
    }
  }

  const rpc = new BotRPCPeer(wsEndpoint, botService);


  const botConfig = await rpc.rpc.getConfig()
  assert(botConfig.clientConfig['@type'] as keyof TYPES === 'dxos.config.Config');
  assert(botConfig.spec.invitation['@type'] as keyof TYPES === 'dxos.echo.invitation.InvitationDescriptor');
  
  const client = new Client(botConfig.clientConfig)
  await client.initialize()

  if(!client.halo.profile) {
    await client.halo.createProfile()
  }

  if(!client.echo.getParty(PublicKey.from(botConfig.spec.partyKey))) {
    await client.echo.acceptInvitation(
      InvitationDescriptor.fromProto(botConfig.spec.invitation)
    )
  }

  const profile = client.halo.profile ?? failUndefined()
  const party = client.echo.getParty(PublicKey.from(botConfig.spec.partyKey))

  await rpc.rpc.sendReport({
    identityKey: profile.publicKey.asUint8Array(),
  })
}


main()


