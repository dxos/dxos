//
// Copyright 2020 DXOS.org
//

import { Codec } from '@dxos/codec-protobuf';
import { createId } from '@dxos/crypto';
import { protocol, Schema } from '@dxos/echo-protocol';
import { createAny } from '@dxos/util';

// eslint-disable-next-line camelcase
import { dxos as object_dxos } from './gen/object';
import ObjectSchema from './gen/object.json';

const codec = new Codec('dxos.FeedMessage')
  .addJson(Schema)
  .addJson(ObjectSchema)
  .build();

describe('Protobuf', () => {
  test('merge definitions', () => {
    const message1: protocol.dxos.FeedMessage = {
      echo: {
        itemId: createId(),
        // eslint-disable-next-line camelcase
        mutation: createAny<object_dxos.echo.object.IObjectMutation>({
          operation: object_dxos.echo.object.ObjectMutation.Operation.SET,
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
