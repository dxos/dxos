//
// Copyright 2024 DXOS.org
//

import { Level } from 'level';

import { type LevelDB } from './level';

// Kept out of the package's main entry: `level` binds a native addon when it is imported, which a
// compiled single-file binary cannot carry, so importing `@dxos/kv-store` for its types alone must not
// reach it. Types live in `./level`; only callers that actually open a database import this.
// TODO(burdon): Replace this lib with just typings?
export const createLevel = (path: string): LevelDB => new Level<string, string>(path);
