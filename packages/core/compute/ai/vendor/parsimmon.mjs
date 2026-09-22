//
// Copyright 2026 DXOS.org
//

// Default, not `import * as`: parsimmon is CommonJS that assigns every combinator onto
// `module.exports`, which `cjs-module-lexer` cannot see, so under plain Node ESM the namespace
// carries `default` alone and `parsimmon.regexp` is undefined.
import parsimmon from 'parsimmon';

export { parsimmon };
