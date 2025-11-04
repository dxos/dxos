//
// Copyright 2024 DXOS.org
//

import type { Blockstore } from 'interface-blockstore';
import { type PrivateDirectory, type PrivateForest } from 'wnfs';

import { store } from './common';

export const wnfsUrl = (filePath: string[]) => 'wnfs://' + filePath.map((f) => encodeURIComponent(f)).join('/');

export const getPathFromUrl = (wnfsUrl: string) =>
  wnfsUrl
    .replace(/^wnfs:\/\//, '')
    .split('/')
    .map((p) => decodeURIComponent(p));

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
  const path = getPathFromUrl(wnfsUrl);
  const wnfsStore = store(blockstore);
  const { result } = await directory.read(path, true, forest, wnfsStore);
  const blob = new Blob([result], { type });
  return URL.createObjectURL(blob);
};
