//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import Keyring from '@polkadot/keyring';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import protobuf from 'protobufjs';
// import { methods, signWithAlice,  } from '@substrate/txwrapper-polkadot';
// import { createSignedTx, createSigningPayload, UnsignedTransaction } from '@substrate/txwrapper';


import {Client} from '@dxos/client'

import {
  App,
  IRegistryClient,
  CID,
  DomainKey,
  DXN,
  RegistryClient,
  createCID,
  createApiPromise,
  createKeyring,
  schemaJson,
  AuctionsClient,
  IAuctionsClient,
  SignTxFunction,
  registryTypes,
} from '../../src';
import { DEFAULT_DOT_ENDPOINT } from './test-config';
import { KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { IKeyringPair, Registry, Signer, SignerPayloadJSON, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { KeyringPair } from '@polkadot/keyring/types';
import assert from 'assert';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { TypeRegistry } from '@polkadot/types';
import { registry } from 'sample-polkadotjs-typegen/interfaces/definitions';


chai.use(chaiAsPromised);

export class TxSigner implements Partial<Signer> {
  private id = 0;
  constructor(private keypair: KeyringPair) { }

  public async signRaw ({ address, data }: SignerPayloadRaw): Promise<SignerResult> {
    console.log({ address, data })
    assert(address === this.keypair.address, 'Signer does not have the keyringPair');
    console.log('TxSigner signRaw...')

    const signature = u8aToHex(this.keypair.sign(hexToU8a(data), {withType: true}));

    console.log('ok, returning signature')

    return {
      id: ++this.id,
      signature
    }
  }
}

export class PayloadSigner implements Partial<Signer> {
  private id = 0;
  constructor(private keypair: KeyringPair, private registry: Registry) { }

  public async signPayload (payload: SignerPayloadJSON): Promise<SignerResult> {
    assert(payload.address === this.keypair.address, 'Signer does not have the keyringPair');
    console.log('PayloadSigner signPayload...')

    const signed = this.registry.createType('ExtrinsicPayload', payload, { version: payload.version }).sign(this.keypair);

    return {
      id: ++this.id,
      ...signed
    };
  }
}

describe.only('Signatures', () => {
  let client: Client
  let keypair: ReturnType<Keyring['addFromUri']>;
  let apiPromise: ApiPromise;

  const registry: Registry = new TypeRegistry();
  registry.register(registryTypes)

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
    // await client.halo.createProfile();
    // await client.halo.addKeyRecord({
    //   publicKey: PublicKey.from(keypair.publicKey),
    //   secretKey: Buffer.from(uri),
    //   type: KeyType.DXNS
    // })
  });

  afterEach(async () => {
    await apiPromise.disconnect();
    await client.destroy();
  });

  it('Can send transactions with normal signer', async () => {
    const auctionName = Math.random().toString(36).substring(2);

    const ogSign = keypair.sign;
    keypair.sign = (...args) => {
      console.log('sign', args);
      return ogSign.bind(keypair)(...args);
    }

    const auctionsApi = new AuctionsClient(apiPromise, tx => tx.signAsync(keypair));

    await auctionsApi.createAuction(auctionName, 100000)
  });

  it('Can send transactions with normal signer, starting from signer', async () => {
    const auctionName = Math.random().toString(36).substring(2);

    const auctionsApi = new AuctionsClient(apiPromise, tx => tx.signAsync(keypair));

    await auctionsApi.createAuction(auctionName, 100000)
  });

  // it.only('Can construct and sign a payload manually', async () => {
  //   const auctionName = Math.random().toString(36).substring(2);

  //   const signTxFunction: SignTxFunction = async (tx) => {
  //     // const unsigned: UnsignedTransaction = tx as any
  //     const unsigned = {...tx}

  //     const signingPayload = createSigningPayload(tx as any, {
  //       registry: registry as TypeRegistry
  //     });

  //     // console.log('creating signer payload..')

  //     // const payload = registry.createType<any>('SignerPayload', {
  //     //   address: keypair.address,
  //     //   method: tx.method
  //     // });

  //     console.log('creating type..')

  //     const extrinsicPayload = registry
  //       .createType('ExtrinsicPayload', tx, {
  //         version: tx.version,
  //         method: tx.method
  //     });

  //     const signature = await signWithAlice(signingPayload);
  //     const signedTx = createSignedTx(unsigned, signature, {registry})


  //     // console.log('now this..')

  //     // const extrinsicPayloadU8a = extrinsicPayload.toU8a({ method: true })
  //     // const actualPayload = extrinsicPayloadU8a.length > 256
  //     //   ? registry.hash(extrinsicPayloadU8a)
  //     //   : extrinsicPayloadU8a;

  //     // console.log('producing signature..')

  //     // const {signature} = registry.createType('ExtrinsicPayload', actualPayload, { version: extrinsicPayload.version }).sign(keypair);

  //     // // const { signature } = extrinsicPayload.toPayload().sign(keypair);

  //     // console.log('adding signature..')
  //     // tx.addSignature(keypair.address, signature, actualPayload)
  //     // console.log('added!')

  //     console.log('returning tx..')
  //     return tx;
  //   }

  //   const auctionsApi = new AuctionsClient(apiPromise, signTxFunction);

  //   await auctionsApi.createAuction(auctionName, 100000)
  // });

  it.only('Can send transactions with external signer', async () => {
    const auctionName = Math.random().toString(36).substring(2);

    const signTxFunction: SignTxFunction = async (tx) => {
      return await tx.signAsync(keypair.address, {signer: new TxSigner(keypair)})
    }
    const auctionsApi = new AuctionsClient(apiPromise, signTxFunction);

    await auctionsApi.createAuction(auctionName, 100000)
  });

  it('Can send transactions with higher-level external signer with types', async () => {
    const auctionName = Math.random().toString(36).substring(2);
    

    const signTxFunction: SignTxFunction = async (tx) => {
      return await tx.signAsync(keypair.address, {signer: new PayloadSigner(keypair, registry)})
    }
    const auctionsApi = new AuctionsClient(apiPromise, signTxFunction);

    await auctionsApi.createAuction(auctionName, 100000)
  });


  it('sign', async () => {
    const auctionName = Math.random().toString(36).substring(2);
    
    const auctionsApi = new AuctionsClient(apiPromise, tx => tx.signAsync(keypair));
    
    const tx= auctionsApi.api.tx.registry.createAuction(auctionName, 100000)

    const signedTx = await tx.signAsync(keypair)

    console.log(signedTx.signature)
    console.log({ valid: keypair.verify(signedTx.toU8a(), signedTx.signature,signedTx.signer.toString()) })

    const tx2= auctionsApi.api.tx.registry.createAuction(auctionName, 100000)

    const signedTx2 = await tx2.signAsync(keypair.address, { signer: new PayloadSigner(keypair, registry) })

    console.log(signedTx2.signature)

  })
});
