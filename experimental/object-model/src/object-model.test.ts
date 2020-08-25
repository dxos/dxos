//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { expectToThrow } from '@dxos/async';
import { createKeyPair, createId } from '@dxos/crypto';
import { WritableArray } from '@dxos/experimental-util';

import { dxos as _dxos } from './proto/gen/object';
import { ObjectModel } from './object-model';
import { ValueUtil } from './mutation';

const log = debug('dxos:echo:object-model:testing');
debug.enable('dxos:echo:*');

describe('object model', () => {
  test('read-only', async () => {
    const itemId = createId();
    const model = new ObjectModel(ObjectModel.meta, itemId);
    expect(model.itemId).toBe(itemId);
    expect(model.toObject()).toEqual({});
    log(model.toObject());

    expectToThrow(async () => {
      await model.setProperty('title', 'DXOS');
    });
  });

  test('mutation', async () => {
    const buffer = new WritableArray<_dxos.echo.object.IObjectMutationSet>();

    const itemId = createId();
    const model = new ObjectModel(ObjectModel.meta, itemId, buffer);
    expect(model.itemId).toBe(itemId);
    expect(model.toObject()).toEqual({});
    log(model.toObject());

    // Update.
    await model.setProperty('title', 'DXOS');
    expect(buffer.objects).toHaveLength(1);
    const { mutations } = buffer.objects[0];
    expect(mutations).toHaveLength(1);
    const mutation = mutations![0];
    expect(mutation).toStrictEqual({
      operation: 0,
      key: 'title',
      value: ValueUtil.createMessage('DXOS')
    });

    // Process.
    const { publicKey: feedKey } = createKeyPair();
    const meta = { feedKey, seq: 0 };
    await model.processMessage(meta, buffer.objects[0]);
    expect(model.toObject()).toStrictEqual({
      title: 'DXOS'
    });
  });
});
