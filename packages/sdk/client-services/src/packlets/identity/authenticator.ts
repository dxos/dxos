//
// Copyright 2022 DXOS.org
//

import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { type Event, Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { type CredentialSigner, verifyCredential } from '@dxos/credentials';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { requirePublicKey } from '@dxos/protocols/buf';
import { AuthSchema, CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type ComplexSet } from '@dxos/util';

import { type AuthProvider, type AuthVerifier } from '../space/index.ts';

export const createAuthProvider =
  (signer: CredentialSigner): AuthProvider =>
  async (nonce) => {
    const credential = await signer.createCredential({
      assertion: create(AuthSchema, {}),
      subject: signer.getIssuer(),
      nonce,
    });

    return toBinary(CredentialSchema, credential);
  };

export type TrustedKeySetAuthVerifierProps = {
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

  constructor(private readonly _params: TrustedKeySetAuthVerifierProps) {}

  async close(): Promise<void> {
    await this._ctx.dispose();
  }

  get verifier(): AuthVerifier {
    return async (nonce, auth) => {
      const credential = fromBinary(CredentialSchema, auth);
      log('authenticating...', { credential });

      const result = await verifyCredential(credential);
      if (result.kind === 'fail') {
        log('Invalid credential', { result });
        return false;
      }

      const proofNonce = credential.proof?.nonce;
      if (!proofNonce?.length || !Buffer.from(nonce).equals(proofNonce)) {
        log('Invalid nonce', { nonce, credential });
        return false;
      }

      const issuer = requirePublicKey(credential.issuer);
      if (this._isTrustedKey(issuer)) {
        log('key is trusted -- auth success', { key: issuer });
        return true;
      }

      const trigger = new Trigger<boolean>();
      this._ctx.onDispose(() => {
        trigger.wake(false);
      });

      const clear = this._params.update.on(this._ctx, () => {
        if (this._isTrustedKey(issuer)) {
          log('auth success', { key: issuer });
          trigger.wake(true);
        } else {
          log('key is not currently in trusted set, waiting...', {
            key: issuer,
            trusted: [...this._params.trustedKeysProvider()],
          });
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

  private _isTrustedKey(deviceKey: PublicKey): boolean {
    const deviceSet = this._params.trustedKeysProvider();
    return deviceSet.has(deviceKey);
  }
}
