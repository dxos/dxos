//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { correctText } from './correction';

describe('correctText', () => {
  test('capitalizes and adds terminal punctuation', ({ expect }) => {
    expect(correctText('so we should ship')).toEqual('So we should ship.');
  });

  test('preserves existing terminal punctuation', ({ expect }) => {
    expect(correctText('done!')).toEqual('Done!');
  });

  test('empty input stays empty', ({ expect }) => {
    expect(correctText('   ')).toEqual('');
  });
});
