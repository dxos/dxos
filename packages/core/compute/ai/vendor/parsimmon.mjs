//
// Copyright 2026 DXOS.org
//

// A default import, not a namespace one: `parsimmon` is CJS that hangs every combinator off the
// exported function, so cjs-module-lexer finds no named exports and Node's namespace object carries
// `default` alone — `parsimmon.regexp is not a function` at first use under plain Node.
import parsimmon from 'parsimmon';

export { parsimmon };
