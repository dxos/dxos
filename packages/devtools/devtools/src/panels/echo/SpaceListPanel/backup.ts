//
// Copyright 2023 DXOS.org
//

import { type SerializedSpace, Serializer } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';

export const exportData = async (space: Space): Promise<Blob> => {
  const backup = await new Serializer().export(space.db);

  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
};

export const importData = async (space: Space, backup: Blob) => {
  try {
    const backupString = await backup.text();
    await new Serializer().import(space.db, JSON.parse(backupString) as SerializedSpace);
  } catch (err) {
    log.catch(err);
  }
};
