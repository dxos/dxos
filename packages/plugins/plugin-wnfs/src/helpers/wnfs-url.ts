//
// Copyright 2024 DXOS.org
//

import type { Blockstore } from 'interface-blockstore';
import { type PrivateDirectory, type PrivateForest } from 'wnfs';

import { store } from './common';

export const wnfsUrl = (filePath: string[]) => {
  return 'wnfs://' + filePath.map((f) => encodeURIComponent(f)).join('/');
};

export const getPathFromUrl = (wnfsUrl: string) =>
  wnfsUrl
    .replace(/^wnfs:\/\//, '')
    .split('/')
    .map((p) => decodeURIComponent(p));

export const readWnfsFile = async ({
  wnfsUrl,
  blockstore,
  forest,
  directory,
}: {
  wnfsUrl: string;
  blockstore: Blockstore;
  forest: PrivateForest;
  directory: PrivateDirectory;
}): Promise<Uint8Array> => {
  const path = getPathFromUrl(wnfsUrl);
  const wnfsStore = store(blockstore);
  const { result } = await directory.read(path, true, forest, wnfsStore);
  return result;
};

export const getBlobUrl = async ({
  wnfsUrl,
  blockstore,
  forest,
  directory,
  type,
}: {
  wnfsUrl: string;
  blockstore: Blockstore;
  forest: PrivateForest;
  directory: PrivateDirectory;
  type?: string;
}) => {
  const result = await readWnfsFile({ wnfsUrl, blockstore, forest, directory });
  // `Uint8Array` is generic over `ArrayBufferLike` (incl. `SharedArrayBuffer`) while DOM's
  // `BlobPart` only covers `ArrayBuffer`-backed views — a gap between the DOM lib types and the
  // TS standard lib, not fixable by typing `result` differently.
  const blob = new Blob([result as BlobPart], { type });
  return URL.createObjectURL(blob);
};
