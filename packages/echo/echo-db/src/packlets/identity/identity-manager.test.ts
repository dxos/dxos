import { Keyring } from "@dxos/keyring";
import { codec } from "@dxos/echo-protocol";
import { FeedStore } from "@dxos/feed-store";
import { createStorage, Storage, StorageType } from "@dxos/random-access-storage";
import { MetadataStore } from "../metadata";
import { IdentityManager } from "./identity-manager";
import { NetworkManager } from "@dxos/network-manager";
import { MemorySignalManager, MemorySignalManagerContext } from "@dxos/messaging";
import { afterTest } from "@dxos/testutils";
import { it as test } from 'mocha'
import expect from 'expect'

describe('identity/identity-manager', () => {
  const setup = async ({
    signalContext = new MemorySignalManagerContext(),
    storage = createStorage({ type: StorageType.RAM }),
  }: {
    signalContext?: MemorySignalManagerContext,
    storage?: Storage
  } = {}) => {
    const metadata = new MetadataStore(storage.createDirectory('metadata'))
    const keyring = new Keyring(storage.createDirectory('keyring'));
    const feedStore = new FeedStore(storage.createDirectory('feeds'), { valueEncoding: codec });

    const networkManager = new NetworkManager({
      signalManager: new MemorySignalManager(signalContext)
    })

    return new IdentityManager(
      metadata,
      keyring,
      feedStore,
      networkManager
    )
  }

  test.only('creates identity', async () => {
    const identityManager = await setup()
    await identityManager.open()
    afterTest(() => identityManager.close())

    const identity = await identityManager.createIdentity();
    expect(identity).toBeTruthy();
  });

  test('reload from storage', async () => {
    const storage = createStorage({ type: StorageType.RAM });

    const identityManager1 = await setup({ storage })
    await identityManager1.open()
    const identity1 = await identityManager1.createIdentity();
    await identityManager1.close()

    const identityManager2 = await setup({ storage })
    await identityManager2.open()
    expect(identityManager2.identity).toBeDefined()
    expect(identityManager2.identity!.identityKey).toEqual(identity1.identityKey)
    expect(identityManager2.identity!.deviceKey).toEqual(identity1.deviceKey)

    // TODO(dmaretskyi): Check that identity is "alive" (space is working and can write mutations).
  })
})