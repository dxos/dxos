//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';
import { type Directory } from '@dxos/random-access-storage';

// TODO(mykola): Make temp file and moveTo desired path.
export const overrideFile = async ({
  path,
  directory,
  content,
}: {
  path: string;
  directory: Directory;
  content: Buffer;
}) => {
  const file = directory.getOrCreateFile(path);
  await file.destroy().catch((error) => log.catch(error));
  const newFile = directory.getOrCreateFile(path);
  await newFile.write(0, content);
};
