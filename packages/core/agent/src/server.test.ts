//
// Copyright 2023 DXOS.org
//

import { afterAll, beforeAll, describe, test } from '@dxos/test';

describe('server', () => {
  const server = undefined;
  beforeAll(() => {});
  afterAll(() => {});

  test('basic', async () => {
    const query = {};
    const response = await fetch('localhost:8080/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    console.log(response);
  });
});
