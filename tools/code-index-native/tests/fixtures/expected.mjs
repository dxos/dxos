//
// Copyright 2026 DXOS.org
//

// Regenerates `constructs-*.expected.n3`: what EYE (the JS backend's reasoner) derives from
// `constructs.data.n3` with `constructs-a.n3`, then from that output with `constructs-b.n3`.
// Run from the repository root: `node tools/code-index-native/tests/fixtures/expected.mjs`.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const here = new URL('.', import.meta.url);
const { n3reasoner } = createRequire(new URL('../../../code-index/package.json', import.meta.url))('eyereasoner');
const read = (name) => readFileSync(new URL(name, here), 'utf8');
const data = read('constructs.data.n3');
const a = await n3reasoner([data, read('constructs-a.n3')].join('\n'), undefined, { output: 'derivations' });
const b = await n3reasoner([data, a, read('constructs-b.n3')].join('\n'), undefined, { output: 'derivations' });
writeFileSync(new URL('constructs-a.expected.n3', here), a);
writeFileSync(new URL('constructs-b.expected.n3', here), b);
