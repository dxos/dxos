//
// Copyright 2021 DXOS.org
//

/* eslint-disable jest/no-export */

import { ApiPromise } from '@polkadot/api/promise';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import Keyring from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { TypeRegistry } from '@polkadot/types';
import { ISubmittableResult, Registry, Signer, SignerPayloadJSON, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import assert from 'assert';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Client } from '@dxos/client';
import { KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';

import {
  createKeyring, registryTypes
} from './api';

chai.use(chaiAsPromised);

export class TxSigner implements Partial<Signer> {
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

export class DxosClientSigner implements Partial<Signer> {
  private id = 0;
  constructor (private client: Client, private publicKey: PublicKey) { }

  public async signRaw ({ data }: SignerPayloadRaw): Promise<SignerResult> {
    const result = await this.client.halo.sign({
      publicKey: this.publicKey,
      payload: data
    });

    return {
      id: ++this.id,
      signature: result.signed
    };
  }
}

describe('Signatures', () => {
  let client: Client;
  let keypair: ReturnType<Keyring['addFromUri']>;
  let apiPromise: ApiPromise;
  let unsignedTx: SubmittableExtrinsic<'promise', ISubmittableResult>;

  const registry: Registry = new TypeRegistry();
  registry.register(registryTypes);

  const auctionName = () => Math.random().toString(36).substring(2);

  before(async () => {
    await cryptoWaitReady();
  });

  beforeEach(async () => {
    apiPromise = await new ApiPromise({ types: registryTypes }).isReady;
    unsignedTx = apiPromise.tx.registry.createAuction(auctionName(), 100000);

    const keyring = await createKeyring();
    const uri = '//Alice';
    keypair = keyring.addFromUri(uri);

    client = new Client({ version: 1 });
    await client.initialize();
    await client.halo.createProfile();
    await client.halo.addKeyRecord({
      publicKey: PublicKey.from(keypair.publicKey),
      secretKey: Buffer.from(uri),
      type: KeyType.DXNS
    });
  });

  afterEach(async () => {
    await apiPromise.disconnect();
    await client.destroy();
  });

  it('Can sign transactions with keypair', async () => {
    const signed = await unsignedTx.signAsync(keypair);
    expect(signed.isSigned).to.be.true;
  });

  it('Can sign transactions with lower-level external signer', async () => {
    const signer = new TxSigner(keypair);
    const signed = await await unsignedTx.signAsync(keypair.address, { signer });
    expect(signed.isSigned).to.be.true;
  });

  it('Can sign transactions with external signer using Client', async () => {
    const signer = new DxosClientSigner(client, PublicKey.from(keypair.addressRaw));
    const signed = await unsignedTx.signAsync(keypair.address, { signer });
    expect(signed.isSigned).to.be.true;
  });
});
