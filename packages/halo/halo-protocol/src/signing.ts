import { canonicalStringify, Keyring } from "@dxos/credentials";
import { raise } from "@dxos/debug";
import { PublicKey } from "@dxos/protocols";
import { Credential } from "./proto";

export function getSignData(credential: Credential): Uint8Array {
  const copy = {
    ...credential,
    proof: {
      ...credential.proof,
      value: new Uint8Array(),
      chain: undefined,
    }
  }

  return Buffer.from(canonicalStringify(copy));
}

export async function sign(keyring: Keyring, key: PublicKey, data: Uint8Array): Promise<Uint8Array> {
  const fullKey = keyring.getKey(key) ?? raise(new Error('Key not available for signing'))
  return keyring.rawSign(Buffer.from(data), fullKey)
}