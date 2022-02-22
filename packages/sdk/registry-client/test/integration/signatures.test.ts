//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import Keyring from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { TypeRegistry } from '@polkadot/types';
import { Registry, Signer, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';
import assert from 'assert';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Client } from '@dxos/client';
import { KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';

import {
  AuctionsClient, createApiPromise, SignTxFunction,
  createKeyring, registryTypes, DxosClientSigner, ApiTransactionHandler
} from '../../src';
import { DEFAULT_DOT_ENDPOINT } from './test-config';

chai.use(chaiAsPromised);

class TxSigner implements Partial<Signer> {
  private id = 0;
  constructor (private keypair: KeyringPair) { }

  public async signRaw ({ address, data }: SignerPayloadRaw): Promise<SignerResult> {
    assert(address === this.keypair.address, 'Signer does not have the keyringPair');

    const signature = u8aToHex(this.keypair.sign(hexToU8a(data), { withType: true }));

    return {
      id: ++this.id,
      signature
    };
  }
}

describe('Signatures', () => {
  let client: Client;
  let keypair: ReturnType<Keyring['addFromUri']>;
  let apiPromise: ApiPromise;

  const registry: Registry = new TypeRegistry();
  registry.register(registryTypes);

  const auctionName = () => Math.random().toString(36).substring(2);

  before(async () => {
    await cryptoWaitReady();
  });

  beforeEach(async () => {
    apiPromise = await createApiPromise(DEFAULT_DOT_ENDPOINT);

    const keyring = await createKeyring();
    const uri = '//Alice';
    keypair = keyring.addFromUri(uri);

    client = new Client({ version: 1, runtime: { services: { dxns: { server: DEFAULT_DOT_ENDPOINT } } } });
    await client.initialize();
    await client.halo.createProfile();
    await client.halo.addKeyRecord({
      publicKey: PublicKey.from(decodeAddress(keypair.address)),
      secretKey: Buffer.from(uri),
      type: KeyType.DXNS_ADDRESS
    });
  });

  afterEach(async () => {
    await apiPromise.disconnect();
    await client.destroy();
  });

  it('Can send transactions with normal signer', async () => {
    {
      const auctionsApi = new AuctionsClient(apiPromise, keypair);
      await auctionsApi.createAuction(auctionName(), 100000);
    }

    {
      const auctionsApi = new AuctionsClient(apiPromise, tx => tx.signAsync(keypair));
      await auctionsApi.createAuction(auctionName(), 100000);
    }
  });

  it('Can send transactions with lower-level external signer', async () => {
    const signTxFunction: SignTxFunction = async (tx) => {
      return await tx.signAsync(keypair.address, { signer: new TxSigner(keypair) });
    };
    const auctionsApi = new AuctionsClient(apiPromise, signTxFunction);

    await auctionsApi.createAuction(auctionName(), 100000);
  });

  it('Can send transactions with external signer using Client', async () => {
    const signTxFunction: SignTxFunction = async (tx) => {
      return await tx.signAsync(keypair.address, { signer: new DxosClientSigner(client, keypair.address, apiPromise.registry) });
    };
    const auctionsApi = new AuctionsClient(apiPromise, signTxFunction);

    await auctionsApi.createAuction(auctionName(), 100000);
  });

  it('Works for different sizes of transaction', async () => {
    const signFn: SignTxFunction = async (tx) => {
      return await tx.signAsync(keypair.address, { signer: new DxosClientSigner(client, keypair.address, apiPromise.registry) });
    };
    const transactionsHandler = new ApiTransactionHandler(apiPromise, signFn);

    // Empirical approach to find the cut-off for
    // hashing vs not-hashing payload before signing in DxosClientSigner.
    for (let i = 174; i < 196; i += 1) {
      const data = 'a'.repeat(i);
      const tx = apiPromise.tx.registry.addRecord(data);
      await transactionsHandler.sendTransaction(tx);
    }
  });
});
