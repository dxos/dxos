//
// Copyright 2024 DXOS.org
//

import type { Blockstore } from 'interface-blockstore';
import { CID } from 'multiformats';
import * as Raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';

import type { Space } from '@dxos/client/echo';
import { log } from '@dxos/log';

import { type WnfsCapabilities } from '../types';

import { Rng, filePath, store } from './common';
import { loadWnfs } from './load';
import { wnfsUrl } from './wnfs-url';

export const upload = async ({
  file,
  blockstore,
  instances,
  space,
}: {
  file: File;
  blockstore: Blockstore;
  instances?: WnfsCapabilities.Instances;
  space: Space;
}) => {
  const { directory, forest } = await loadWnfs({ blockstore, instances, space });
  const wnfsStore = store(blockstore);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = await sha256.digest(bytes);
  const cid = CID.create(1, Raw.code, hash);

  const path = filePath(cid.toString(), space);

  // Given the root directory of the private file system,
  // write the file contents to `path` in said directory.
  const result = await directory.write(path, true, bytes, new Date(), forest, wnfsStore, new Rng());

  // Given the new immutable instance of the root directory after writing to it,
  // **store** the changes in the "dark forest" and the associated (block) store.
  const [_, updatedForest] = await result.rootDir.store(result.forest, wnfsStore, new Rng());
  const cidBytes = await updatedForest.store(wnfsStore);

  // Update the forest pointer on the associated space.
  space.properties.wnfs.privateForestCid = CID.decode(cidBytes).toString();

  // Generate `wnfs://` URL & return the info.
  const info = {
    name: file.name,
    type: file.type,
    url: wnfsUrl(path),
    cid: cid.toString(),
  };

  log('upload', { file, info });
  return info;
};
