//
// Copyright 2024 DXOS.org
//

import type { Blockstore } from 'interface-blockstore';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { type BlockStore as WnfsBlockStore } from 'wnfs';

import * as crypto from '@dxos/crypto';
import { type Space } from '@dxos/react-client/echo';

//
// PATH
//

export const filePath = (fileName: string, space: Space) => ['spaces', space.id, 'files', fileName];

//
// RNG
//

export class Rng {
  randomBytes(count: number): Uint8Array {
    return new Uint8Array(crypto.randomBytes(count));
  }
}

//
// STORE
//

export const store = (blockstore: Blockstore): WnfsBlockStore => {
  const getBlock = async (cid: Uint8Array): Promise<Uint8Array | undefined> => {
    const decodedCid = CID.decode(cid);
    return await blockstore.get(decodedCid);
  };

  const hasBlock = async (cid: Uint8Array): Promise<boolean> => {
    const decodedCid = CID.decode(cid);
    return await blockstore.has(decodedCid);
  };

  const putBlockKeyed = async (cid: Uint8Array, bytes: Uint8Array): Promise<void> => {
    const decodedCid = CID.decode(cid);
    await blockstore.put(decodedCid, bytes);
  };

  // Don't hash blocks with the rs-wnfs default Blake 3, sha256 has better support.
  const putBlock = async (bytes: Uint8Array, codec: number): Promise<Uint8Array> => {
    const hash = await sha256.digest(bytes);
    const cid = CID.create(1, codec, hash);
    await blockstore.put(cid, bytes);
    return cid.bytes;
  };

  return { getBlock, hasBlock, putBlockKeyed, putBlock };
};

export const storeName = () => 'dxos/wnfs';

//
// OTHER
//

export const readFile = (file: File): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (result === null || result === undefined || typeof result === 'string') {
        reject(new Error('Expected an ArrayBuffer'));
        return;
      }
      resolve(new Uint8Array(result));
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsArrayBuffer(file);
  });
