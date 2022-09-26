import { until } from '@dxos/async'
import { Config, ConfigProto } from '@dxos/config'
import { afterTest } from '@dxos/testutils'
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/echo/invitation'
import { ClientServiceHost } from '../src/packlets/services/service-host'
import { InvitationState } from '@dxos/protocols/proto/dxos/client'

export const defaultTestingConfig: ConfigProto = {
  version: 1,
  runtime: {
    services: {
      signal: {
        server: 'ws://localhost:4000/.well-known/dx/signal'
      }
    }
  }
};

describe('ServiceHost', () => {
  it('device invitations', async () => {
    const peer1 = new ClientServiceHost(new Config(defaultTestingConfig))
    await peer1.open()
    afterTest(() => peer1.close())
    const peer2 = new ClientServiceHost(new Config(defaultTestingConfig))
    await peer2.open()
    afterTest(() => peer2.close())

    await peer1.services.ProfileService.createProfile({});
    
    const invitation = await until<InvitationDescriptor>((resolve) => {
      const stream = peer1.services.ProfileService.createInvitation();
      stream.subscribe(msg => {
        if(msg.descriptor) {
          resolve(msg.descriptor)
        }
      })
    })

    await until(resolve => {
      const stream = peer2.services.ProfileService.acceptInvitation(invitation);
      stream.subscribe(msg => {
        if(msg.state === InvitationState.SUCCESS) {
          resolve()
        }
      })
    })
  }).timeout(10_000)
})