//
// Copyright 2020 DxOS.org
//

import { ReadableStreamBuffer } from 'stream-buffers';
import eos from 'end-of-stream';
import {pumpify} from 'pumpify';
import through from 'through2';

import { Codec } from '@dxos/codec-protobuf';

import { ObjectStore } from './object-store';
import { createObjectId } from './util';

const schema = require('./proto/gen/echo.json');

const codec = new Codec('echo.ObjectMutationSet')
  .addJson(schema)
  .build();

const { values: Operation } = codec.getType('echo.ObjectMutation.Operation');

test('protobuf codec', () => {
  const message = {
    mutations: [
      {
        objectId: 'object-1',
        mutations: [
          {
            key: 'title',
            value: {
              string: 'DXOS'
            }
          },
          {
            operation: Operation.ARRAY_PUSH,
            key: 'versions',
            value: {
              string: '0.0.1'
            }
          }
        ]
      },
      {
        objectId: 'object-2',
        deleted: true
      }
    ]
  };

  const buffer = codec.encode(message);

  const { mutations } = codec.decode(buffer);
  expect(mutations).toHaveLength(2);
});

test('protobuf stream', () => {
  return new Promise((resolve, reject) => {
    const objectStore = new ObjectStore();

    // Process messages.
    const processor = through.obj(async (chunk, _, next) => {
      const { mutations } = codec.decode(chunk);
      objectStore.applyMutations(mutations);
      next(null, chunk);
    });

    const protoStream = new ReadableStreamBuffer();

    const pipeline = pumpify(protoStream, processor);

    // Done.
    pipeline.on('finish', () => {
      const object = objectStore.getObjectById(createObjectId('test', '123'));
      expect(object.properties.title).toBe('DXOS');
      expect(object.properties.version).toBe('0.0.1');

      resolve();
    });

    eos(pipeline, (err) => {
      if (err) {
        reject(err);
      }
    });

    protoStream.put(codec.encode({
      mutations: [
        {
          objectId: createObjectId('test', '123'),
          mutations: [
            {
              key: 'title',
              value: {
                string: 'DXOS'
              }
            }
          ]
        }
      ]
    }));

    protoStream.put(codec.encode({
      mutations: [
        {
          objectId: createObjectId('test', '123'),
          mutations: [
            {
              key: 'version',
              value: {
                string: '0.0.1'
              }
            }
          ]
        }
      ]
    }));

    protoStream.stop();
  });
});
