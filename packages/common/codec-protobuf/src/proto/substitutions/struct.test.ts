//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { structSubstitutions } from './struct';

describe('structSubstitutions', () => {
  const dummyStruct = {
    first: 1,
    second: 2,
    flag: true,
    text: 'hello',
    nested: {
      first: 1,
      second: 2,
      flag: true,
      text: 'hello',
      objectArray: [{ first: 1 }, { second: 2 }],
    },
    array: [1, 2, 3, 4, 5],
  };

  const encodedStruct = {
    fields: {
      first: { numberValue: 1 },
      second: { numberValue: 2 },
      flag: { boolValue: true },
      text: { stringValue: 'hello' },
      nested: {
        structValue: {
          fields: {
            first: { numberValue: 1 },
            second: { numberValue: 2 },
            flag: { boolValue: true },
            text: { stringValue: 'hello' },
            objectArray: {
              listValue: {
                values: [
                  { structValue: { fields: { first: { numberValue: 1 } } } },
                  { structValue: { fields: { second: { numberValue: 2 } } } },
                ],
              },
            },
          },
        },
      },
      array: {
        listValue: {
          values: [{ numberValue: 1 }, { numberValue: 2 }, { numberValue: 3 }, { numberValue: 4 }, { numberValue: 5 }],
        },
      },
    },
  };

  test('can encode and decode a struct', async () => {
    const encoded = structSubstitutions['google.protobuf.Struct'].encode(dummyStruct);
    const decoded = structSubstitutions['google.protobuf.Struct'].decode(encoded);
    expect(decoded).to.deep.equal(dummyStruct);
  });

  test('can encode a struct', async () => {
    const encoded = structSubstitutions['google.protobuf.Struct'].encode(dummyStruct);
    expect(encoded).to.deep.equal(encodedStruct);
  });

  test('can decode a struct', async () => {
    const decoded = structSubstitutions['google.protobuf.Struct'].decode(encodedStruct);
    expect(decoded).to.deep.equal(dummyStruct);
  });
});
