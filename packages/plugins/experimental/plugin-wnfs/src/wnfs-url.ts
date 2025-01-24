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

export const getBlobUrl = async ({
  wnfsUrl,
  blockstore,
  directory,
  forest,
}: {
  wnfsUrl: string;
  blockstore: Blockstore;
  directory: PrivateDirectory;
  forest: PrivateForest;
}) => {
  const path = getPathFromUrl(wnfsUrl);
  const wnfsStore = store(blockstore);
  const { result } = await directory.read(path, true, forest, wnfsStore);
  const blob = new Blob([result]);
  return URL.createObjectURL(blob);
};
