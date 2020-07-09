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
        valueI: 1,
        valueF: 2.02
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
                    key: 'valueI',
                    value: {
                      int: 1
                    }
                  },
                  {
                    key: 'valueF',
                    value: {
                      float: 2.02
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

test('ValueUtil bytes', () => {
  {
    const data = Buffer.from('Hello');
    const message = ValueUtil.createMessage({
      name: 'DxOS',
      data
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
              bytes: Buffer.from('Hello')
            }
          }
        ]
      }
    });
  }

  {
    const object = ValueUtil.applyValue({}, 'data', ValueUtil.createMessage(Buffer.from('World')));
    expect(object.data).toEqual(Buffer.from('World'));
  }
});
