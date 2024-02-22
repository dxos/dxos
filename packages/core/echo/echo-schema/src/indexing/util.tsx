//
// Copyright 2024 DXOS.org
//

import { type File } from '@dxos/random-access-storage';

export const overrideFile = async (file: File, content: Buffer) => {
  const { size } = await file.stat();
  if (content.length < size) {
    await file.del(content.length, size - content.length);
  }
  await file.write(0, content);
};
