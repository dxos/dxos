import { schema } from "@dxos/echo-protocol";
import { verifyCredential } from "@dxos/halo-protocol";
import { PublicKey } from "@dxos/protocols";
import { ComplexSet } from "@dxos/util";
import { AuthProvider, AuthVerifier } from "../space/auth-plugin";
import { CredentialSigner } from "./credential-signer";

export const createHaloAuthProvider = (signer: CredentialSigner): AuthProvider => async nonce => {
  const credential = await signer.createCredential({
    assertion: {
      "@type": "dxos.halo.credentials.Auth",
    },
    subject: signer.getIssuer(),
    nonce,
  })

  return schema.getCodecForType('dxos.halo.credentials.Credential').encode(credential)
}

export const createHaloAuthVerifier = (getDeviceSet: () => ComplexSet<PublicKey>): AuthVerifier => async auth => {
  const credential = schema.getCodecForType('dxos.halo.credentials.Credential').decode(auth)
  const deviceSet = getDeviceSet()

  const result = await verifyCredential(credential)
  if (result.kind === 'fail') {
    return false;
  }

  return deviceSet.has(credential.issuer)
}