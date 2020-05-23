//
// Copyright 2020 DxOS.org
//

import { createObjectId, fromObject } from './util';

test('test', () => {
  const object = {
    id: createObjectId('test'),
    properties: {
      title: 'Test-1',
      complete: false,
      priority: 1
    }
  };

  // TODO(burdon): Merge into single mutation.
  const messages = fromObject(object);
  expect(messages).toHaveLength(3);
});
