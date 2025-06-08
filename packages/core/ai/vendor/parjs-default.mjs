import { createRequire } from 'node:module';

// TODO(dmaretskyi): Must be like this or it breaks vitest.
const require = createRequire(import.meta.url);
const parjs = require('parjs');
const parjsCombinators = require('parjs/combinators');

export { parjsCombinators, parjs };
