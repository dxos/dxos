//
// Copyright 2020 DXOS.org
//

// This file is not compiled or run because it introduces a circular dependency on echo-db

import { sleep } from '@dxos/async';
import { createId, PublicKey } from '@dxos/crypto';
import { FeedWriter } from '@dxos/echo-protocol';

import { ObjectModel } from './object-model';
import { ObjectMutationSet } from './proto';

const createModel = () => {
  const feedKey = PublicKey.random();
  const memberKey = PublicKey.random();
  let seq = 0;

  const writer: FeedWriter<ObjectMutationSet> = {
    write: async (mutation) => {
      await sleep(10);

      const meta = {
        feedKey,
        memberKey,
        seq: seq++
      };

      // TODO(marik-d): Investigate why setImmediate is required.
      setImmediate(() => model.processor.write({ mutation, meta } as any));

      return meta;
    }
  };

  const model = new ObjectModel(ObjectModel.meta, createId(), writer);
  return model;
};

it('can set a property', async () => {
  const model = createModel();

  await model.setProperty('foo', 'bar');

  expect(model.getProperty('foo')).toEqual('bar');
});

it('property updates are optimistically applied', async () => {
  const model = createModel();

  const promise = model.setProperty('foo', 'bar');

  expect(model.getProperty('foo')).toEqual('bar');

  await promise;
});
