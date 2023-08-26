//
// Copyright 2023 DXOS.org
//

import { afterAll, beforeAll, describe, test } from '@dxos/test';

describe('server', () => {
  beforeAll(() => {});
  afterAll(() => {});

  test.skip('basic', async () => {
    const query = {};
    const response = await fetch('localhost:3000/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    // console.log(response);
  });
});
