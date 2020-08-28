//
// Copyright 2020 DXOS.org
//

import { createId } from '@dxos/crypto';
import { Codec } from '@dxos/codec-protobuf';
import { dxos, Schema } from '@dxos/experimental-echo-protocol';
import { createAny } from '@dxos/experimental-util';

import ObjectSchema from './gen/object.json';

// NOTE: Typescript cannot merge namespace definitions from different packages.
import { dxos as _dxos } from './gen/object';

const codec = new Codec('dxos.FeedMessage')
  .addJson(Schema)
  .addJson(ObjectSchema)
  .build();

describe('Protobuf', () => {
  test('merge definitions', () => {
    const message1: dxos.FeedMessage = {
      echo: {
        itemId: createId(),
        mutation: createAny<_dxos.echo.object.IObjectMutation>({
          operation: _dxos.echo.object.ObjectMutation.Operation.SET,
          key: 'title',
          value: {
            string: 'DXOS'
          }
        }, 'dxos.echo.object.ObjectMutation')
      }
    };

    const buffer = codec.encode(message1);
    const message2 = codec.decode(buffer);
    expect(message1).toEqual(message2);
  });
});
