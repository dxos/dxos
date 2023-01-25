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

export const createAuthProvider =
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

export type TrustedKeySetAuthVerifierParams = {
  // TODO(dmaretskyi): Change to `isTrusted: (key) => bool`.
  trustedKeysProvider: () => ComplexSet<PublicKey>;
  update: Event<void>;
  /**
   * Timeout to wait for the device key to be added to the trusted set.
   */
  authTimeout: number;
};

/**
 * Verifies credentials of another member in the space based on a set of trusted key.
 * Will wait up to `authTimeout` for the key to be added to the trusted set.
 */
export class TrustedKeySetAuthVerifier {
  private _ctx = new Context();

  // prettier-ignore
  constructor(
    private readonly _params: TrustedKeySetAuthVerifierParams
  ) {}

  async close() {
    await this._ctx.dispose();
  }

  get verifier(): AuthVerifier {
    return async (nonce, auth) => {
      const credential = schema.getCodecForType('dxos.halo.credentials.Credential').decode(auth);
      log('authenticating...', { credential });

      const result = await verifyCredential(credential);
      if (result.kind === 'fail') {
        log('Invalid credential', { result });
        return false;
      }

      if (!credential.proof.nonce || !Buffer.from(nonce).equals(credential.proof.nonce)) {
        log('Invalid nonce', { nonce, credential });
        return false;
      }

      if (this._isTrustedKey(credential.issuer)) {
        log('key is not currently in trusted set, waiting...', { key: credential.issuer });
        return true;
      }

      const trigger = new Trigger<boolean>();
      this._ctx.onDispose(() => {
        trigger.wake(false);
      });

      const clear = this._params.update.on(this._ctx, () => {
        if (this._isTrustedKey(credential.issuer)) {
          log('auth success', { key: credential.issuer });
          trigger.wake(true);
        } else {
          log('key is not currently in trusted set, waiting...', { key: credential.issuer });
        }
      });

      try {
        return await trigger.wait({ timeout: this._params.authTimeout });
      } catch {
        return false;
      } finally {
        clear();
      }
    };
  }

  private _isTrustedKey(deviceKey: PublicKey) {
    const deviceSet = this._params.trustedKeysProvider();
    return deviceSet.has(deviceKey);
  }
}
