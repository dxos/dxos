//
// Copyright 2026 DXOS.org
//

// Default, not namespace, import: parsimmon is CommonJS, so under plain node (the EDGE nightly runs its
// plans with `node --import tsx`) a namespace import has no `regexp`; bundlers synthesize it either way.
import parsimmon from 'parsimmon';

export { parsimmon };
