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
import { type ComplexSet, arraysEqual } from '@dxos/util';

// @import-as-namespace

/** Produces a credential proving the peer may join the space, for the given nonce. */
export type AuthProvider = (nonce: Uint8Array) => Promise<Uint8Array | undefined>;

/** Verifies a credential produced by an {@link AuthProvider}. */
export type AuthVerifier = (nonce: Uint8Array, credential: Uint8Array) => Promise<boolean>;

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
      // Compared as bytes: the browser `buffer` polyfill's `equals` rejects a plain `Uint8Array`,
      // which is what protobuf decoding yields for the nonce.
      if (!proofNonce?.length || !arraysEqual(nonce, proofNonce)) {
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
