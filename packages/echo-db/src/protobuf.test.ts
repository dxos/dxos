//
// Copyright 2020 DXOS.org
//

import hypercore from 'hypercore';
import pify from 'pify';
import ram from 'random-access-memory';

import { Codec } from '@dxos/codec-protobuf';

import { dxos } from './proto/gen/echo';
import EchoSchema from './proto/gen/echo.json';

import { fromObject } from './object-store';

const codec = new Codec('dxos.echo.Envelope')
  .addJson(EchoSchema)
  .build();

/**
 * Basic hypercore (feed) encoding.
 */
test('hypercore encoding', async () => {
  const feed = hypercore(ram, { valueEncoding: codec });

  const message: dxos.echo.IObjectMutationSet = {
    mutations: [
      fromObject({
        id: 'object-1',
        properties: {
          foo: 100
        }
      })
    ]
  };

  await pify(feed.append.bind(feed))({
    message: {
      __type_url: 'dxos.echo.ObjectMutationSet',
      ...message
    }
  });

  const { message: { mutations } } = await pify(feed.get.bind(feed))(0);
  expect(mutations).toHaveLength(1);
});
