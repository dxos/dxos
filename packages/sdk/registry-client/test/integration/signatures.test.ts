//
// Copyright 2021 DXOS.org
//

import { Client } from '@dxos/client';
import { KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { ApiPromise } from '@polkadot/api/promise';
import Keyring from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { TypeRegistry } from '@polkadot/types';
import { Registry, Signer, SignerPayloadJSON, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import assert from 'assert';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  AuctionsClient, createApiPromise,
  createKeyring, registryTypes, SignTxFunction
} from '../../src';
import { DEFAULT_DOT_ENDPOINT } from './test-config';



chai.use(chaiAsPromised);

export class TxSigner implements Partial<Signer> {
  private id = 0;
  constructor(private keypair: KeyringPair) { }

  public async signRaw ({ address, data }: SignerPayloadRaw): Promise<SignerResult> {
    assert(address === this.keypair.address, 'Signer does not have the keyringPair');

    const signature = u8aToHex(this.keypair.sign(hexToU8a(data), {withType: true}));

    return {
      id: ++this.id,
      signature
    }
  }
}

export class DxosClientSigner implements Partial<Signer> {
  private id = 0;
  constructor(private client: Client, private publicKey: PublicKey) { }

  public async signRaw ({ data }: SignerPayloadRaw): Promise<SignerResult> {
    const result = await this.client.halo.sign({
      publicKey: this.publicKey,
      payload: data
    })

    return {
      id: ++this.id,
      signature: result.signed
    }
  }
}

export class PayloadSigner implements Partial<Signer> {
  private id = 0;
  constructor(private keypair: KeyringPair, private registry: Registry) { }

  public async signPayload (payload: SignerPayloadJSON): Promise<SignerResult> {
    assert(payload.address === this.keypair.address, 'Signer does not have the keyringPair');

    const signed = this.registry.createType('ExtrinsicPayload', payload, { version: payload.version }).sign(this.keypair);

    return {
      id: ++this.id,
      ...signed
    };
  }
}

describe('Signatures', () => {
  let client: Client
  let keypair: ReturnType<Keyring['addFromUri']>;
  let apiPromise: ApiPromise;

  const registry: Registry = new TypeRegistry();
  registry.register(registryTypes)

  const auctionName = () => Math.random().toString(36).substring(2);

  before(async () => {
    await cryptoWaitReady();
  })

  beforeEach(async () => {
    apiPromise = await createApiPromise(DEFAULT_DOT_ENDPOINT);

    const keyring = await createKeyring();
    const uri = '//Alice';
    keypair = keyring.addFromUri(uri);


    client = new Client({version: 1, runtime: {services: {dxns: {server: DEFAULT_DOT_ENDPOINT}}}})
    await client.initialize();
    await client.halo.createProfile();
    await client.halo.addKeyRecord({
      publicKey: PublicKey.from(keypair.publicKey),
      secretKey: Buffer.from(uri),
      type: KeyType.DXNS
    })

  });

  afterEach(async () => {
    await apiPromise.disconnect();
    await client.destroy();
  });

  it('Can send transactions with normal signer', async () => {
    {
      const auctionsApi = new AuctionsClient(apiPromise, keypair);
      await auctionsApi.createAuction(auctionName(), 100000)
    }
    
    {
      const auctionsApi = new AuctionsClient(apiPromise, tx => tx.signAsync(keypair));
      await auctionsApi.createAuction(auctionName(), 100000)
    }
  });

  it('Can send transactions with lower-level external signer', async () => {
    const signTxFunction: SignTxFunction = async (tx) => {
      return await tx.signAsync(keypair.address, {signer: new TxSigner(keypair)})
    }
    const auctionsApi = new AuctionsClient(apiPromise, signTxFunction);

    await auctionsApi.createAuction(auctionName(), 100000)
  });

  it('Can send transactions with higher-level external signer', async () => {
    const signTxFunction: SignTxFunction = async (tx) => {
      return await tx.signAsync(keypair.address, {signer: new PayloadSigner(keypair, registry)})
    }
    const auctionsApi = new AuctionsClient(apiPromise, signTxFunction);

    await auctionsApi.createAuction(auctionName(), 100000)
  });

  it('Can send transactions with external signer using Client', async () => {
    const signTxFunction: SignTxFunction = async (tx) => {
      return await tx.signAsync(keypair.address, {signer: new DxosClientSigner(client, PublicKey.from(keypair.addressRaw))})
    }
    const auctionsApi = new AuctionsClient(apiPromise, signTxFunction);

    await auctionsApi.createAuction(auctionName(), 100000)
  });
});
