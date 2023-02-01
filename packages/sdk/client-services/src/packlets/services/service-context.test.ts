import { MemorySignalManagerContext } from "@dxos/messaging";
import { describe, test } from "@dxos/test";
import { createServiceContext } from "../testing";

describe('services/ServiceContext', () => {
  // test('device invitations', async () => {
  //   const networkContext = new MemorySignalManagerContext();
  //   const device1 = createServiceContext({ signalContext: networkContext });
  //   await device1.createIdentity();

  //   const device2 = createServiceContext({ signalContext: networkContext });
  //   const invitation = device1.haloInvitations.createInvitation()
  //   invitation.subscribe({
  //   })
  //   device1.haloInvitations.acceptInvitation(invitation.invitation)

  //   await device2.haloInvitations.acceptInvitation()
  // })

  // test('second device synchronized created space', async () => {
  //   const networkContext = new MemorySignalManagerContext();
  //   const device1 = createServiceContext({ signalContext: networkContext });
  //   await device1.createIdentity();
  //   const space1 = await device1.dataSpaceManager!.createSpace();

  //   const device2 = createServiceContext({ signalContext: networkContext });

  //   device1.haloInvitations.createInvitation()

  //   await device2.haloInvitations.acceptInvitation()

  // })
})