import { test } from 'vitest';
import { LARGE_DOC_HEX } from './large-doc';
import { load } from '@automerge/automerge';

test('loading large doc', () => {
  // - 62 kb reified JSON
  // - 1011 changes
  // - 209 kb binary automerge data
  const buf = Buffer.from(LARGE_DOC_HEX, 'hex');

  console.time('load');
  const doc = load(buf);
  console.timeEnd('load');
});
