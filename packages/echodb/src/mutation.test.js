//
// Copyright 2020 DxOS.org
//

import { ValueUtil, MutationUtil, KeyValueUtil } from './mutation';
import { createObjectId } from './util';

test('ValueUtil', () => {
  {
    const value = null;
    expect(ValueUtil.createMessage(value)).toStrictEqual({ isNull: true });
  }

  {
    const value = {
      name: 'DxOS',
      data: {
        version: 1
      }
    };

    expect(ValueUtil.createMessage(value)).toStrictEqual({
      objectValue:
        [
          {
            property: 'name',
            value: {
              stringValue: 'DxOS'
            }
          },
          {
            property: 'data',
            value: {
              objectValue: [
                {
                  property: 'version',
                  value: {
                    intValue: 1
                  }
                }
              ]
            }
          }
        ]

    });
  }
});

test('MutationUtil', () => {
  const object = {
    id: createObjectId('test')
  };

  const mutation = MutationUtil.createMessage(object.id, KeyValueUtil.createMessage('name', 'DxOS'));
  MutationUtil.applyMutation(object, mutation);
  expect(object.name).toBe('DxOS');

});

test('MutationUtilNested', () => {
  const object = {
    id: createObjectId('test')
  };

  const mutation = MutationUtil.createMessage(object.id, KeyValueUtil.createMessage('nameObject',
    {
      name: 'DxOS'
    }
  ));
  MutationUtil.applyMutation(object, mutation);
  expect(object.nameObject.name).toBe('DxOS');

});
