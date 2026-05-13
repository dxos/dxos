//
// Copyright 2023 DXOS.org
//

import { importSpace, type ImportSpaceOptions } from '@dxos/client/echo';
import { type SerializedSpace } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';

/**
 * Import a JSON backup into an existing space (merging into its database).
 * For creating a new space from an archive use {@link Client.spaces.import} instead.
 */
export const importData = async (space: Space, backup: Blob, options?: ImportSpaceOptions) => {
  try {
    const backupString = await backup.text();
    const data = JSON.parse(backupString) as SerializedSpace;

    await importSpace(space.internal.db, data, options);
  } catch (err) {
    log.catch(err);
  }
};
