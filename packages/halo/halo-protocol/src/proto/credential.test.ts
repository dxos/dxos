//
// Copyright 2019 DXOS.org
//

import expect from 'expect';

import { schema } from './gen';

// eslint-disable-next-line jest/no-export
export const codec = schema.getCodecForType('dxos.halo.credentials.Credential');

// TODO(burdon): Factor out to proto util?
const codecLoop = (message: any) => codec.decode(codec.encode(message));

// TODO(burdon): Test signing.
it('Creates credential messages', () => {
 
});
