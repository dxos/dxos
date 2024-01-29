//
// Copyright 2022 DXOS.org
//

import expect from 'expect'; // TODO(burdon): Can't use chai with wait-for-expect?

import { sleep } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { TextObject } from './text-object';
import { TypedObject } from './typed-object';
import { createDatabase } from '../testing';

describe('TextObject', () => {
  test('basic', async () => {
    const { db } = await createDatabase();
    const text = new TextObject();
    db.add(text);
    await db.flush();

    expect(text.content).toEqual('');

    (text.content as any) = 'Hello world';
    expect(text.content).toEqual('Hello world');
  });

  test('text property', async () => {
    const { db } = await createDatabase();
    const task = new TypedObject();
    db.add(task);
    await db.flush();
    task.text = new TextObject();
    await sleep(10);
    expect(task.text.content).toEqual('');

    task.text.content = 'Hello world';
    expect(task.text.content).toEqual('Hello world');
  });
});
