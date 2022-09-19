//
// Copyright 2022 DXOS.org
//

import { CredentialSigner, verifyCredential } from '@dxos/halo-protocol';
import { log } from '@dxos/log';
import { schema, PublicKey } from '@dxos/protocols';
import { ComplexSet } from '@dxos/util';

import { AuthProvider, AuthVerifier } from '../space';

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
