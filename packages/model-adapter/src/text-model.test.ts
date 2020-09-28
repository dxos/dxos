//
// Copyright 2020 DXOS.org
//

import { waitForCondition } from '@dxos/async';
import { createKeyPair, createId } from '@dxos/crypto';
import { TextModel, TYPE_TEXT_MODEL_UPDATE } from '@dxos/text-model';
import { WritableArray } from '@dxos/util';

import { createModelAdapter } from './adapter';
import { protocol } from './proto';

const TextModelAdapter = createModelAdapter<any>(TYPE_TEXT_MODEL_UPDATE, TextModel);

describe('TextModel', () => {
  test('local', async () => {
    const buffer = new WritableArray<protocol.dxos.echo.adapter.IMutation>();
    const model = new TextModelAdapter(TextModelAdapter.meta, createId(), buffer);

    model.model.insert(0, 'INSERTED TEXT');
    expect(model.model.textContent).toBe('INSERTED TEXT');

    model.model.insert(8, ' NEW');
    expect(model.model.textContent).toBe('INSERTED NEW TEXT');
  });

  test('Sync', async () => {
    const buffer1 = new WritableArray<protocol.dxos.echo.adapter.IMutation>();
    const model1 = new TextModelAdapter(TextModelAdapter.meta, createId(), buffer1);
    const buffer2 = new WritableArray<protocol.dxos.echo.adapter.IMutation>();
    const model2 = new TextModelAdapter(TextModelAdapter.meta, createId(), buffer2);

    model1.model.insert(0, 'INSERTED TEXT');
    await waitForCondition(() => buffer1.objects.length > 0, 100);

    const { publicKey: feedKey } = createKeyPair();
    const meta = { feedKey, seq: 0 };
    await model2.processMessage(meta, buffer1.objects[0]);

    expect(model2.model.textContent).toBe('INSERTED TEXT');
  });
});
