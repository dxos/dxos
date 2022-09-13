//
// Copyright 2022 DXOS.org
//

import { join } from 'node:path';

export const stringDiff = (first: string, second: string) => first.split(second).join('');
export const getFullPath = (rootPath: string, path: string) => join(rootPath, stringDiff(path, rootPath));
