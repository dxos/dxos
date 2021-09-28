//
// Copyright 2019 DXOS.org
//

import expect from 'expect';

import { schema } from './gen';

export const codec = schema.getCodecForType('dxos.halo.credentials.Credential');

// TODO(burdon): Factor out to proto util?
const codecLoop = (message: any) => codec.decode(codec.encode(message));

// TODO(burdon): Test signing.
it('Creates credential messages', () => {
  const message = codecLoop({
    id: 'did:dxos:1234'
  });

  expect(message.id).toEqual('did:dxos:1234');
});
