//
// Copyright 2020 DXOS.org
//

import { createObjectId, parseObjectId } from './util';

test('create/parse IDs', () => {
  const { type, id } = parseObjectId(createObjectId('test', '123'));
  expect(type).toBe('test');
  expect(id).toBe('123');
});
