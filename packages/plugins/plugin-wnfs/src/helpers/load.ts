//
// Copyright 2024 DXOS.org
//

import type { Blockstore } from 'interface-blockstore';
import { CID } from 'multiformats';
import * as Uint8Arrays from 'uint8arrays';
import { AccessKey, PrivateDirectory, PrivateForest, PrivateNode } from 'wnfs';

import * as Option from 'effect/Option';

import { Annotation, Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

import { WnfsStateAnnotation } from '../annotations';
import { type WnfsCapabilities } from '#types';

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
  // Delete old properties if they exist (pre-DX-971 migration cleanup).
  const propsAny = space.properties as any;
  if (propsAny.wnfs_access_key !== undefined && propsAny.wnfs_private_forest_cid !== undefined) {
    Obj.update(space.properties, (obj) => {
      delete (obj as any)['wnfs_access_key'];
      delete (obj as any)['wnfs_private_forest_cid'];
    });
  }
  // Migrate legacy wnfs data key to annotation.
  if (propsAny.wnfs !== undefined && Option.isNone(Annotation.get(space.properties, WnfsStateAnnotation))) {
    Annotation.set(space.properties, WnfsStateAnnotation, propsAny.wnfs);
    Obj.update(space.properties, (obj) => {
      delete (obj as any)['wnfs'];
    });
  }

  const wnfsState = Option.getOrUndefined(Annotation.get(space.properties, WnfsStateAnnotation));
  const cacheKey = wnfsState?.privateForestCid as any;
  if (cacheKey && instances?.[cacheKey]) {
    return instances[cacheKey];
  }

  const exists = !!wnfsState;
  const instance = exists ? await loadWnfsDir(blockstore, space) : await createWnfsDir(blockstore, space);
  if (instances) {
    // Re-read after createWnfsDir so newly created instances are cached under the real CID.
    const newCacheKey = Option.getOrUndefined(Annotation.get(space.properties, WnfsStateAnnotation))?.privateForestCid as any;
    if (newCacheKey) {
      instances[newCacheKey] = instance;
    }
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

  Annotation.set(space.properties, WnfsStateAnnotation, {
    accessKey: Uint8Arrays.toString(accessKeyRaw.toBytes(), 'base64'),
    privateForestCid: CID.decode(cidBytes).toString(),
  });

  return {
    directory: dir,
    forest: newForest,
  };
};

const loadWnfsDir = async (blockstore: Blockstore, space: Space) => {
  const wnfsStore = store(blockstore);

  const wnfsState = Option.getOrUndefined(Annotation.get(space.properties, WnfsStateAnnotation))!;
  const accessKey = AccessKey.fromBytes(Uint8Arrays.fromString(wnfsState.accessKey, 'base64'));
  const forest: PrivateForest = await PrivateForest.load(
    CID.parse(wnfsState.privateForestCid).bytes,
    wnfsStore,
  );
  const node: PrivateNode = await PrivateNode.load(accessKey, forest, wnfsStore);

  return {
    directory: node.asDir(),
    forest,
  };
};
