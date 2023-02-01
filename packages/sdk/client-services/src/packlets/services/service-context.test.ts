import { log } from "@dxos/log";
import { MemorySignalManagerContext } from "@dxos/messaging";
import { describe, test } from "@dxos/test";
import { createServiceContext, syncItems } from "../testing";
import { performInvitation } from "../testing/invitaiton-utils";

describe('services/ServiceContext', () => {
  test('existing space is synchronized on device invitations', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = createServiceContext({ signalContext: networkContext });
    await device1.createIdentity();
    const space1 = await device1.dataSpaceManager!.createSpace();

    const device2 = createServiceContext({ signalContext: networkContext });
    await performInvitation(device1.haloInvitations, device2.haloInvitations, undefined)

    const space2 = await device2.dataSpaceManager!.spaces.get(space1.key);
    await syncItems(space1, space2!);
  })

  test('new space is synchronized on device invitations', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = createServiceContext({ signalContext: networkContext });
    await device1.createIdentity();
    
    const device2 = createServiceContext({ signalContext: networkContext });
    await performInvitation(device1.haloInvitations, device2.haloInvitations, undefined)

    const space1 = await device1.dataSpaceManager!.createSpace();
    await device2.dataSpaceManager?.updated.waitForCondition(() => !!device2.dataSpaceManager!.spaces.get(space1.key));
    const space2 = await device2.dataSpaceManager!.spaces.get(space1.key);
    await syncItems(space1, space2!);
  })

  test('joined space is synchronized on device invitations', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = createServiceContext({ signalContext: networkContext });
    await device1.createIdentity();
    
    const device2 = createServiceContext({ signalContext: networkContext });
    await performInvitation(device1.haloInvitations, device2.haloInvitations, undefined)

    const identity2 = createServiceContext({ signalContext: networkContext });
    await identity2.createIdentity()
    const space1 = await identity2.dataSpaceManager!.createSpace();
    await performInvitation(identity2.spaceInvitations!, device1.spaceInvitations!, space1)

    await device2.dataSpaceManager?.updated.waitForCondition(() => !!device2.dataSpaceManager!.spaces.get(space1.key));
    const space2 = await device2.dataSpaceManager!.spaces.get(space1.key);
    await syncItems(space1, space2!);
  })
})