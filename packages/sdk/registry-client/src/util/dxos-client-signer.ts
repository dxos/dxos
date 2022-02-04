//
// Copyright 2021 DXOS.org
//

import { Signer, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
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

  constructor (private client: Client, address: string) {
    this.publicKey = PublicKey.from(decodeAddress(address));
  }

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
