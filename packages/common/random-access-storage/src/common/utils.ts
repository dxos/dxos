//
// Copyright 2022 DXOS.org
//

import { join } from 'node:path';

// TODO(burdon): Document.
export const stringDiff = (first: string, second: string) => first.split(second).join('');

export const getFullPath = (root: string, path: string) => join(root, stringDiff(path, root));
