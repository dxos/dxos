//
// Copyright 2021 DXOS.org
//

import PolkadotKeyring from '@polkadot/keyring';
import { Registry, Signer, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';
import assert from 'assert';

import { Client, HaloSigner, SignRequest, SignResponse } from '@dxos/client';
import { KeyRecord, KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/protocols';

/**
 * Plugin to sign HALO messages.
 */
export class ClientSignerAdapter implements HaloSigner {
  async sign (request: SignRequest, key: KeyRecord): Promise<SignResponse> {
    await cryptoWaitReady();

    assert(key.secretKey, 'Secret key is missing.');
    assert(key.type === KeyType.DXNS_ADDRESS, 'Only DXNS address key signing is supported.');
    assert(request.payload, 'Empty payload');
    const keyring = new PolkadotKeyring({ type: 'sr25519' });
    const keypair = keyring.addFromUri(key.secretKey.toString());

    // TODO(burdon): Return signed message only?
    return {
      signed: keypair.sign(request.payload, { withType: true })
    };
  }
}

/**
 * Can be used as an external signer for signing DXNS transactions.
 * Uses a DXNS key stored in HALO.
 */
export class ClientSigner implements Partial<Signer> {
  private id = 0;

  private readonly publicKey: PublicKey

  constructor (
    private client: Client,
    private registry: Registry,
    address: string
  ) {
    this.publicKey = PublicKey.from(decodeAddress(address));
  }

  public async signRaw ({ data }: SignerPayloadRaw): Promise<SignerResult> {
    let payload = hexToU8a(data);

    // @polkadot/api/packages/types/src/extrinsic/util.ts
    if (payload.length > 256) {
      payload = this.registry.hash(payload);
    }

    const result: SignResponse = await this.client.halo.sign({
      publicKey: this.publicKey,
      payload
    });

    return {
      id: ++this.id,
      signature: u8aToHex(result.signed)
    };
  }
}
