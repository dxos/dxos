//
// Copyright 2024 DXOS.org
//

import type { Blockstore } from 'interface-blockstore';
import { CID } from 'multiformats';
import * as Uint8Arrays from 'uint8arrays';
import { AccessKey, PrivateDirectory, PrivateForest, PrivateNode } from 'wnfs';

import { type Space } from '@dxos/react-client/echo';

import { type WnfsCapabilities } from '../types';

import { Rng, store } from './common';

//
// LOAD
//

export const loadWnfs = async ({
  space,
  blockstore,
  instances,
}: {
  space: Space;
  blockstore: Blockstore;
  instances?: WnfsCapabilities.Instances;
}) => {
  // TODO(wittjosiah): Remove.
  // Delete old properties if they exist.
  if (space.properties.wnfs_access_key !== undefined && space.properties.wnfs_private_forest_cid !== undefined) {
    delete space.properties.wnfs_access_key;
    delete space.properties.wnfs_private_forest_cid;
  }

  const cacheKey = space.properties.wnfs?.privateForestCid;
  if (instances?.[cacheKey]) {
    return instances[cacheKey];
  }

  const exists = !!space.properties.wnfs;
  const instance = exists ? await loadWnfsDir(blockstore, space) : await createWnfsDir(blockstore, space);
  if (instances) {
    instances[cacheKey] = instance;
  }

  return instance;
};

//
// PRIVATE
//

const createWnfsDir = async (blockstore: Blockstore, space: Space) => {
  const wnfsStore = store(blockstore);
  const rng = new Rng();
  const forest = new PrivateForest(rng);

  const dirResult = await PrivateDirectory.newAndStore(forest.emptyName(), new Date(), forest, wnfsStore, rng);
  const dir = dirResult.rootDir as PrivateDirectory;

  const [accessKeyRaw, newForest]: [AccessKey, PrivateForest] = await dir
    .asNode()
    .store(dirResult.forest as PrivateForest, wnfsStore, rng);

  const cidBytes = await newForest.store(wnfsStore);

  space.properties.wnfs = {
    accessKey: Uint8Arrays.toString(accessKeyRaw.toBytes(), 'base64'),
    privateForestCid: CID.decode(cidBytes).toString(),
  };

  return {
    directory: dir,
    forest: newForest,
  };
};

const loadWnfsDir = async (blockstore: Blockstore, space: Space) => {
  const wnfsStore = store(blockstore);

  const accessKey = AccessKey.fromBytes(Uint8Arrays.fromString(space.properties.wnfs.accessKey, 'base64'));
  const forest: PrivateForest = await PrivateForest.load(
    CID.parse(space.properties.wnfs.privateForestCid).bytes,
    wnfsStore,
  );
  const node: PrivateNode = await PrivateNode.load(accessKey, forest, wnfsStore);

  return {
    directory: node.asDir(),
    forest,
  };
};
