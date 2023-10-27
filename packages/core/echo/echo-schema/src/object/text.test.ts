//
// Copyright 2022 DXOS.org
//

import expect from 'expect'; // TODO(burdon): Can't use chai with wait-for-expect?

import { sleep } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { Text } from './text';
import { TypedObject } from './typed-object';
import { createDatabase } from '../testing';

describe('Text', () => {
  test('basic', async () => {
    const { db } = await createDatabase();
    const text = new Text();
    db.add(text);
    await db.flush();

    expect(text.doc).toBeDefined();
    expect(text.text).toEqual('');

    text.model!.insert('Hello world', 0);
    expect(text.text).toEqual('Hello world');
  });

  test('text property', async () => {
    const { db } = await createDatabase();
    const task = new TypedObject();
    db.add(task);
    await db.flush();
    task.text = new Text();
    await sleep(10);
    expect(task.text.doc).toBeDefined();
    expect(task.text.model).toBeDefined();
    expect(task.text.text).toEqual('');

    task.text.model!.insert('Hello world', 0);
    expect(task.text.text).toEqual('Hello world');
  });
});
