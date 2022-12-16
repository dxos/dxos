//
// Copyright 2022 DXOS.org
//

import { Event, Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { verifyCredential, CredentialSigner } from '@dxos/credentials';
import { AuthProvider, AuthVerifier } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { ComplexSet } from '@dxos/util';

export const createHaloAuthProvider =
  (signer: CredentialSigner): AuthProvider =>
  async (nonce) => {
    const credential = await signer.createCredential({
      assertion: {
        '@type': 'dxos.halo.credentials.Auth'
      },
      subject: signer.getIssuer(),
      nonce
    });

    return schema.getCodecForType('dxos.halo.credentials.Credential').encode(credential);
  };

export type HaloAuthVerifierParams = {
  trustedDevicesProvider: () => ComplexSet<PublicKey>;
  update: Event<void>;
  /**
   * Timeout to wait for the device key to be added to the trusted set.
   */
  authTimeout: number;
};

/**
 * Verifies credentials of another device of the same identity in the HALO space.
 * Will wait up to `authTimeout` for the device key to be added to the trusted set.
 */
export class HaloAuthVerifier {
  private _ctx = new Context();

  constructor(private readonly _params: HaloAuthVerifierParams) {}

  async close() {
    await this._ctx.dispose();
  }

  private _isTrustedDevice(deviceKey: PublicKey) {
    const deviceSet = this._params.trustedDevicesProvider();
    return deviceSet.has(deviceKey);
  }

  get verifier(): AuthVerifier {
    return async (nonce, auth) => {
      const credential = schema.getCodecForType('dxos.halo.credentials.Credential').decode(auth);

      const result = await verifyCredential(credential);
      if (result.kind === 'fail') {
        log('Invalid credential', { result });
        return false;
      }

      if (!credential.proof.nonce || !Buffer.from(nonce).equals(credential.proof.nonce)) {
        log('Invalid nonce', { nonce, credential });
        return false;
      }

      if (this._isTrustedDevice(credential.issuer)) {
        return true;
      }

      const trigger = new Trigger<boolean>();
      this._ctx.onDispose(() => {
        trigger.wake(false);
      });
      const clear = this._params.update.on(this._ctx, () => {
        if (this._isTrustedDevice(credential.issuer)) {
          trigger.wake(true);
        }
      });
      try {
        await trigger.wait({ timeout: this._params.authTimeout });
        return true;
      } catch {
        return false;
      } finally {
        clear();
      }
    };
  }
}
