//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { decodeStruct, encodeStruct } from './struct';

describe('structSubstitutions', function () {
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
      objectArray: [{ first: 1 }, { second: 2 }]
    },
    array: [1, 2, 3, 4, 5]
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
                  { structValue: { fields: { second: { numberValue: 2 } } } }
                ]
              }
            }
          }
        }
      },
      array: {
        listValue: {
          values: [{ numberValue: 1 }, { numberValue: 2 }, { numberValue: 3 }, { numberValue: 4 }, { numberValue: 5 }]
        }
      }
    }
  };

  it('can encode and decode a struct', async function () {
    const encoded = encodeStruct(dummyStruct);
    const decoded = decodeStruct(encoded);
    expect(decoded).to.deep.equal(dummyStruct);
  });

  it('can encode a struct', async function () {
    const encoded = encodeStruct(dummyStruct);
    expect(encoded).to.deep.equal(encodedStruct);
  });

  it('can decode a struct', async function () {
    const decoded = decodeStruct(encodedStruct);
    expect(decoded).to.deep.equal(dummyStruct);
  });
});
