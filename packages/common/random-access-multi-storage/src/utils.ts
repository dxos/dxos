//
// Copyright 2022 DXOS.org
//

import { join } from 'path';

export const getRelativePath = (rootPath: string, path: string) => path.split(rootPath).join('');
export const getFullPath = (rootPath: string, path: string) => join(rootPath, getRelativePath(rootPath, path));
