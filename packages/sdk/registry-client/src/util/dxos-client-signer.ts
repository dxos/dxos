//
// Copyright 2021 DXOS.org
//

import { Registry, Signer, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';

import { Client } from '@dxos/client';
import { PublicKey } from '@dxos/crypto';

/**
 * Can be used as an external signer for signing DXNS transactions.
 * Uses a DXNS key stored in Halo.
 */
export class DxosClientSigner implements Partial<Signer> {
  private id = 0;
  private publicKey: PublicKey

  constructor (private client: Client, address: string, private registry: Registry) {
    this.publicKey = PublicKey.from(decodeAddress(address));
  }

  public async signRaw ({ data }: SignerPayloadRaw): Promise<SignerResult> {
    let payload = hexToU8a(data)  

    // @polkadot/api/packages/types/src/extrinsic/util.ts
    if(payload.length > 256) {
      payload = this.registry.hash(payload)
    }

    const result = await this.client.halo.sign({
      publicKey: this.publicKey,
      payload: u8aToHex(payload)
    });

    return {
      id: ++this.id,
      signature: result.signed
    };
  }
}
