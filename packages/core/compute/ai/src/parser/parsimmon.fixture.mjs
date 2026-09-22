//
// Copyright 2026 DXOS.org
//

// Run by `parsimmon.subprocess.test.ts` under plain `node`, where the CJS interop that the test
// guards actually applies — under vitest the whole graph goes through vite and cannot fail.
import { parsimmon as P } from '#parsimmon';

const textChunk = P.regexp(/[^<]+/).map((content) => ({ type: 'text', content }));
const result = textChunk.parse('hello');
if (!result.status || result.value.content !== 'hello') {
  throw new Error(`unexpected parse result: ${JSON.stringify(result)}`);
}

process.stdout.write('parsimmon ok\n');
