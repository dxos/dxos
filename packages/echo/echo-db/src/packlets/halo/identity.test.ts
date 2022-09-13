import { it as test } from 'mocha'
import expect from 'expect'
import { Keyring } from '@dxos/keyring'
import { Identity } from './identity'
import { FeedStore } from '@dxos/feed-store'
import { createStorage, StorageType } from '@dxos/random-access-storage'
import { codec } from '@dxos/echo-protocol'
import { createKeyPair } from '@dxos/crypto'
import { PublicKey, Timeframe } from '@dxos/protocols'
import { afterTest } from '@dxos/testutils'
import { AdmittedFeed, createCredential, createGenesisCredentialSequence, verifyCredential } from '@dxos/halo-protocol'

describe('halo/identity', () => {
  test('create', async () => {
    const keyring = new Keyring()
    const identityKey = await keyring.createKey()
    const deviceKey = await keyring.createKey()
    const spaceKey = await keyring.createKey();

    const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
    const createFeed = () => {
      // TODO(dmaretskyi): Use keyring to generate the key pair.
      const { publicKey, secretKey } = createKeyPair();
      return feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    };


    // TODO(dmaretskyi): Separate test for cold start after genesis.
    const controlFeed = await createFeed();
    const dataFeed = await createFeed();

    const identity = new Identity({
      signer: keyring,
      identityKey,
      deviceKey,
      spaceParams: {
        spaceKey,
        genesisFeed: controlFeed,
        controlWriteFeed: controlFeed,
        dataWriteFeed: dataFeed,
        initialTimeframe: new Timeframe(),
        feedProvider: key => feedStore.openReadOnlyFeed(key)
      }
    })

    await identity.open()
    afterTest(() => identity.close())

    //
    // Identity genesis
    //
    {
      // TODO(burdon): Don't export functions from packages (group into something more accountable).
      const genesisMessages = await createGenesisCredentialSequence(
        keyring,
        spaceKey,
        identityKey,
        deviceKey,
        controlFeed.key
      );

      // Space genesis
      for (const credential of genesisMessages) {
        await identity.controlMessageWriter?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }

      // Admit device
      await identity.controlMessageWriter?.write({
        '@type': 'dxos.echo.feed.CredentialsMessage',
        credential: await createCredential({
          issuer: identityKey,
          subject: deviceKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            identityKey,
            deviceKey,
          },
          keyring,
        })
      });
      
      // Admit data feed
      await identity.controlMessageWriter?.write({
        '@type': 'dxos.echo.feed.CredentialsMessage',
        credential: await createCredential({
          issuer: identityKey,
          subject: dataFeed.key,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            partyKey: spaceKey,
            identityKey,
            deviceKey,
            designation: AdmittedFeed.Designation.DATA
          },
          keyring,
        })
      });

    }
    
    // Wait for identity to be ready.
    await identity.ready.wait()

    const identitySigner = identity.getIdentityCredentialSigner()
    const credential = await identitySigner({
      subject: identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.IdentityProfile',
        profile: {
          displayName: 'Alice',
        },
      },
    })
    expect(credential.issuer).toEqual(identityKey)
    expect(await verifyCredential(credential)).toEqual({ kind: 'pass' })
  })
})
