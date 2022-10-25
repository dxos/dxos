//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { Predicate, Query } from '@dxos/protocols/proto/dxos/echo/model/object';

import { Matcher } from './matcher';

// TODO(burdon): Adapt for ObjectModel.
// TODO(burdon): Nested properties?
// TODO(burdon): Indexed properties? (schema?)
const getter = (item: any, key: string) => item[key];

describe('Matcher', function () {
  it('Basic queries', function () {
    const queries: Query[] = [
      {
        root: {
          op: Predicate.Operation.EQUALS,
          key: 'name',
          value: {
            string: 'DXOS'
          }
        }
      },
      {
        root: {
          op: Predicate.Operation.EQUALS,
          key: 'name',
          value: {
            string: 'item-0'
          }
        }
      },
      {
        root: {
          op: Predicate.Operation.EQUALS,
          key: 'complete',
          value: {
            bool: true // TODO(burdon): Should false match undefined?
          }
        }
      },
      {
        root: {
          op: Predicate.Operation.NOT,
          predicates: [
            {
              op: Predicate.Operation.EQUALS,
              key: 'name',
              value: {
                string: 'item-1'
              }
            }
          ]
        }
      },
      {
        root: {
          op: Predicate.Operation.OR,
          predicates: [
            {
              op: Predicate.Operation.EQUALS,
              key: 'name',
              value: {
                string: 'item-0'
              }
            },
            {
              op: Predicate.Operation.EQUALS,
              key: 'name',
              value: {
                string: 'item-2'
              }
            }
          ]
        }
      },
      {
        root: {
          op: Predicate.Operation.IN,
          key: 'label',
          value: {
            array: {
              values: [
                {
                  string: 'red'
                },
                {
                  string: 'green'
                },
                {
                  string: 'blue'
                }
              ]
            }
          }
        }
      },
      {
        root: {
          op: Predicate.Operation.OR,
          predicates: [
            {
              op: Predicate.Operation.EQUALS,
              key: 'name',
              value: {
                string: 'item-0'
              }
            },
            {
              op: Predicate.Operation.IN,
              key: 'label',
              value: {
                array: {
                  values: [
                    {
                      string: 'red'
                    },
                    {
                      string: 'green'
                    },
                    {
                      string: 'blue'
                    }
                  ]
                }
              }
            }
          ]
        }
      },
      {
        root: {
          op: Predicate.Operation.PREFIX_MATCH,
          key: 'name',
          value: {
            string: 'item'
          }
        }
      },
      {
        root: {
          op: Predicate.Operation.TEXT_MATCH,
          key: 'description',
          value: {
            string: 'dx'
          }
        }
      },
      {
        root: {
          op: Predicate.Operation.TEXT_MATCH,
          key: 'description',
          value: {
            string: ''
          }
        }
      }
    ];

    const items = [
      {
        name: 'item-0',
        description: 'this should not match any text queries.',
        count: 0
      },
      {
        name: 'item-1',
        label: 'red',
        description: 'this item -- references  dxos  projects.',
        count: 1
      },
      {
        name: 'item-2',
        label: 'green',
        complete: true,
        count: 1
      },
      {
        name: 'item-3',
        complete: true,
        count: 2
      },
      {
        name: 'item-4',
        complete: false
      }
    ];

    const expected = [
      [],
      [items[0]],
      [items[2], items[3]],
      [items[0], items[2], items[3], items[4]],
      [items[0], items[2]],
      [items[1], items[2]],
      [items[0], items[1], items[2]],
      [items[0], items[1], items[2], items[3], items[4]],
      [items[1]],
      []
    ];

    const matcher = new Matcher({ getter });
    const results = queries.map((query) => matcher.matchItems(query, items));

    results.forEach((result, i) => {
      expect(result).toEqual(expected[i]);
    });
  });
});
