//
// Copyright 2024 DXOS.org
//

import type { Blockstore } from 'interface-blockstore';
import { CID } from 'multiformats';
import * as Uint8Arrays from 'uint8arrays';
import { AccessKey, PrivateForest, PrivateDirectory, PrivateNode } from 'wnfs';

import { type Space } from '@dxos/react-client/echo';

import { Rng, store } from './common';

//
// LOAD
//

export const loadWnfs = async (space: Space, blockstore: Blockstore) => {
  const exists =
    space.properties.wnfs_access_key !== undefined && space.properties.wnfs_private_forest_cid !== undefined;

  return exists ? await loadWnfsDir(blockstore, space) : await createWnfsDir(blockstore, space);
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

  space.properties.wnfs_access_key = Uint8Arrays.toString(accessKeyRaw.toBytes(), 'base64');
  space.properties.wnfs_private_forest_cid = CID.decode(cidBytes).toString();

  return {
    directory: dir,
    forest: newForest,
  };
};

const loadWnfsDir = async (blockstore: Blockstore, space: Space) => {
  const wnfsStore = store(blockstore);

  const accessKey = AccessKey.fromBytes(Uint8Arrays.fromString(space.properties.wnfs_access_key, 'base64'));
  const forest = await PrivateForest.load(CID.parse(space.properties.wnfs_private_forest_cid).bytes, wnfsStore);
  const node: PrivateNode = await PrivateNode.load(accessKey, forest, wnfsStore);

  return {
    directory: node.asDir(),
    forest,
  };
};
