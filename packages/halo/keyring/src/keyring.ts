import { PublicKey } from "@dxos/protocols";
import { Signer } from "./signer";
import { Directory } from '@dxos/random-access-storage'
import { ComplexMap } from "@dxos/util";
import { todo } from "@dxos/debug";
import * as crypto from 'node:crypto'


export class Keyring implements Signer {
  private readonly _keyCache = new ComplexMap<PublicKey, CryptoKeyPair>(key => key.toHex());

  constructor (
    private readonly _storage: Directory
  ) {}

  sign (key: PublicKey, message: Uint8Array): Promise<Uint8Array> {

  }

  verify (key: PublicKey, message: Uint8Array, signature: Uint8Array): Promise<boolean> {

  }

  exportKey(key: PublicKey): Promise<Uint8Array> {

  }


  async createKey(): Promise<PublicKey> {
    const cryptoKey = await crypto.webcrypto.subtle.generateKey({
      name: 'ECDSA',
      namedCurve: 'P-256'
    }, true, ['sign', 'verify'])
  }

  deleteKey(key: PublicKey): Promise<void> {
    
  }

  list(): Promise<PublicKey[]> {
    return todo(`We need a method to enumerate files in a directory.`)
  }
}