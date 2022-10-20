//
// Copyright 2022 DXOS.org
//

import { promises as fs } from 'fs';
import * as path from 'path';

export const fileExists = async (path: string) => {
  try {
    await fs.stat(path);
  } catch (err) {
    return false;
  }
  return true;
};

export const ellipsis = (s: string, n = 80) =>
  s?.length > n
    ? s.slice(0, n / 2 - 3) + '...' + s.slice(s.length - n / 2 - 3)
    : s;

export const kib = (bytes: number) =>
  bytes < 1024 ? `${bytes}B` : `${Math.round(bytes / 1024)}KiB`;

export const relative = (s: string) => path.relative(process.cwd(), s);
