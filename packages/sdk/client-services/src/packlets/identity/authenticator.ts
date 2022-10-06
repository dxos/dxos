//
// Copyright 2022 DXOS.org
//

import { verifyCredential, CredentialSigner } from '@dxos/credentials';
import { AuthProvider, AuthVerifier } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { ComplexSet } from '@dxos/util';

export const createHaloAuthProvider = (signer: CredentialSigner): AuthProvider => async nonce => {
  const credential = await signer.createCredential({
    assertion: {
      '@type': 'dxos.halo.credentials.Auth'
    },
    subject: signer.getIssuer(),
    nonce
  });

  return schema.getCodecForType('dxos.halo.credentials.Credential').encode(credential);
};

export const createHaloAuthVerifier = (getDeviceSet: () => ComplexSet<PublicKey>): AuthVerifier => async (nonce, auth) => {
  const credential = schema.getCodecForType('dxos.halo.credentials.Credential').decode(auth);
  const deviceSet = getDeviceSet();

  const result = await verifyCredential(credential);
  if (result.kind === 'fail') {
    log('Invalid credential', { result });
    return false;
  }

  if (!credential.proof.nonce || !Buffer.from(nonce).equals(credential.proof.nonce)) {
    log('Invalid nonce', { nonce, credential });
    return false;
  }

  if (!deviceSet.has(credential.issuer)) {
    log('Device not in allowed set');
    return false;
  }

  return true;
};
