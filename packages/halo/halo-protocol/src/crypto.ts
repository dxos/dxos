import { PublicKey, verify } from '@dxos/crypto';
import assert from 'assert';
import stableStringify from 'json-stable-stringify'
import { Credential, KnownAny, Proof, SignedData } from './proto';
import { Signer } from '@dxos/credentials'

const canonicalStringify = (obj: any) => {
  return stableStringify(obj, {
    replacer: (key: any, value: any) => {
      if (value) {
        if (PublicKey.isPublicKey(value)) {
          return value.toHex();
        }
        if (Buffer.isBuffer(value)) {
          return value.toString('hex');
        }
        if (value instanceof Uint8Array || (value.data && value.type === 'Buffer')) {
          return Buffer.from(value).toString('hex');
        }
      }
      return value;
    }
  });
};

const encodeSignedData = (signedData: SignedData): Buffer => {
  assert(signedData.credential?.proofs === undefined)
  return Buffer.from(canonicalStringify(signedData))
}

const getSignedData = (credential: Credential, proof: Proof): Buffer => {
  const signedData: SignedData = {
    credential: { ...credential },
    created: proof.created,
    nonce: proof.nonce,
  }
  delete signedData.credential?.proofs;

  return encodeSignedData(signedData)
}

export const verifyProof = async (credential: Credential, proof: Proof): Promise<boolean> => {
  assert(proof.signature, 'Invalid proof: Missing signature')
  assert(proof.signer, 'Invalid proof: Missing signer PK')
  assert(proof.type === 'ED25519', 'Invalid proof type')
  return verify(getSignedData(credential, proof), Buffer.from(proof.signature), proof.signer.asBuffer())
}

export interface SignOptions {
  claim: KnownAny,
  signingKeys: PublicKey[],
  signer: Signer,
  nonce?: Uint8Array,
  expiry?: Date
}

export const signCredential = async (opts: SignOptions): Promise<Credential> => {
  const credential: Credential = {
    claim: opts.claim,
    expiry: opts.expiry,
    issued: new Date(),
  }
  const proofs: Proof[] = []
  for(const key of opts.signingKeys) {
    const created = new Date();
    const signature = opts.signer.rawSign(encodeSignedData({
      credential,
      created,
      nonce: opts.nonce
    }), key)
    proofs.push({
      signer: key,
      created,
      signature,
      nonce: opts.nonce,
      type: 'ED25519'
    })
  }

  return {
    ...credential,
    proofs,
  }
}