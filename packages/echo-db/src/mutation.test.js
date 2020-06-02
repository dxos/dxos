//
// Copyright 2020 DxOS.org
//

import { ValueUtil } from './mutation';

test('ValueUtil', () => {
  {
    const message = ValueUtil.createMessage(null);

    expect(message).toStrictEqual({
      null: true
    });
  }

  {
    const message = ValueUtil.createMessage({
      name: 'DxOS',
      data: {
        version: 1
      }
    });

    expect(message).toStrictEqual({
      object: {
        properties: [
          {
            key: 'name',
            value: {
              string: 'DxOS'
            }
          },
          {
            key: 'data',
            value: {
              object: {
                properties: [
                  {
                    key: 'version',
                    value: {
                      int: 1
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    });
  }
});

test('ValueUtil.applyValue null', () => {
  const object = ValueUtil.applyValue({ title: 'DXOS' }, 'title', ValueUtil.createMessage(null));
  expect(object.title).toBeUndefined();
});

// TODO(burdon): Test other scalars.
test('ValueUtil.applyValue scalars', () => {
  const object = ValueUtil.applyValue({}, 'title', ValueUtil.createMessage('DXOS'));
  expect(object.title).toBe('DXOS');
});

test('ValueUtil.applyValue object', () => {
  const object = {
    version: '0.0.1',
    packages: {
      foo: 1,
      bar: 2
    }
  };

  const { module } = ValueUtil.applyValue({}, 'module', ValueUtil.createMessage(object));
  expect(module).toStrictEqual(object);
});
