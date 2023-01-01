//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { createDatabase, db } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { Task } from './proto';

describe('database', () => {
  test('constructor', async () => {
    const db1 = await createDatabase();
    const task = new Task();
    expect(task[db]).to.be.undefined;
    await db1.save(task);
    expect(task[db]).not.to.be.undefined;
  });
});
