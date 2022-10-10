//
// Copyright 2021 DXOS.org
//

import { sync as pkgDir } from 'pkg-dir';

export const TOOLCHAIN_PACKAGE_DIR = pkgDir(new URL('.', import.meta.url).pathname)!;
