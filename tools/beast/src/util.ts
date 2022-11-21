//
// Copyright 2022 DXOS.org
//

import { execSync } from 'child_process';

// TODO(burdon): Factor out.

export const array = <T>(collection: Set<T> | Map<any, T>): T[] => Array.from(collection.values() ?? []);

export const getBaseDir = () => execSync('git rev-parse --show-toplevel').toString().trim();
