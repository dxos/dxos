//
// Copyright 2026 DXOS.org
//

import * as namespace from 'parsimmon';

// Parsimmon is CJS and builds its API dynamically, so cjs-module-lexer finds no named exports and
// a namespace import under plain Node ESM carries only `default`, where Vite's interop carries the API.
export const parsimmon = namespace.default ?? namespace;
