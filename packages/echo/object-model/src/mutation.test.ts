//
// Copyright 2020 DXOS.org
//

import { MutationUtil, ValueUtil } from './mutation';
import { ObjectMutation } from './proto';
import expect from 'expect';
import { it as test } from 'mocha'

test('ValueUtil', () => {
  {
    const message = ValueUtil.createMessage(null);

    expect(message).toStrictEqual({
      null: true
    });
  }

  {
    const message = ValueUtil.createMessage({
      name: 'DXOS',
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
              string: 'DXOS'
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
      name: 'DXOS',
      data
    });

    expect(message).toStrictEqual({
      object: {
        properties: [
          {
            key: 'name',
            value: {
              string: 'DXOS'
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

test('MutationUtil', () => {
  const data1 = MutationUtil.applyMutationSet({}, {
    mutations: [
      {
        operation: ObjectMutation.Operation.SET,
        key: 'name',
        value: {
          string: 'DXOS'
        }
      },
      {
        operation: ObjectMutation.Operation.SET_ADD,
        key: 'labels',
        value: {
          string: 'red'
        }
      },
      {
        operation: ObjectMutation.Operation.SET_ADD,
        key: 'labels',
        value: {
          string: 'green'
        }
      },
      {
        operation: ObjectMutation.Operation.ARRAY_PUSH,
        key: 'contact',
        value: {
          object: {
            properties: [
              {
                key: 'email',
                value: {
                  string: 'admin@dxos.org'
                }
              }
            ]
          }
        }
      },
      {
        operation: ObjectMutation.Operation.ARRAY_PUSH,
        key: 'contact',
        value: {
          object: {
            properties: [
              {
                key: 'email',
                value: {
                  string: 'info@dxos.org'
                }
              }
            ]
          }
        }
      }
    ]
  });

  expect(data1).toEqual({
    name: 'DXOS',
    labels: [
      'red',
      'green'
    ],
    contact: [
      {
        email: 'admin@dxos.org'
      },
      {
        email: 'info@dxos.org'
      }
    ]
  });

  const data2 = MutationUtil.applyMutationSet(data1, {
    mutations: [
      {
        operation: ObjectMutation.Operation.DELETE,
        key: 'contact'
      },
      {
        operation: ObjectMutation.Operation.SET_ADD,
        key: 'labels',
        value: {
          string: 'green'
        }
      },
      {
        operation: ObjectMutation.Operation.SET_DELETE,
        key: 'labels',
        value: {
          string: 'red'
        }
      }
    ]
  });

  expect(data2).toEqual({
    name: 'DXOS',
    labels: [
      'green'
    ]
  });
});
