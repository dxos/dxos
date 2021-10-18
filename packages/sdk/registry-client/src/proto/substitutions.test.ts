//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import substitutions from './substitutions';

const { encode, decode } = substitutions['google.protobuf.Timestamp'];

describe('Substitutions', () => {
  it('Correctly encodes and decodes dates', () => {
    const date = new Date();
    const encoded = encode(date);
    const decoded = decode(encoded);

    expect(date.getTime()).to.be.equal(decoded.getTime());
  });
});
