//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Predicate } from '@dxos/protocols/proto/dxos/echo/model/object';

import { Matcher } from './matcher';
import { TextIndex } from './text-index';

// https://en.wikipedia.org/wiki/Shakespeare%27s_plays#Canonical_plays
const items = [
  {
    id: 'item-0',
    title: 'Richard III',
    description: 'Richard III is a play by William Shakespeare. It was probably written around 1593.',
    url: 'https://en.wikipedia.org/wiki/Richard_III_(play)',
    category: 'history'
  },
  {
    id: 'item-1',
    title: 'Hamlet',
    description: 'The Tragedy of Hamlet, Prince of Denmark, often shortened to Hamlet,' +
      ' is a tragedy written by William Shakespeare sometime between 1599 and 1601.',
    url: 'https://en.wikipedia.org/wiki/Hamlet',
    category: 'tragedy'
  },
  {
    id: 'item-2',
    title: 'Macbeth',
    description: 'Macbeth, fully The Tragedy of Macbeth, is a tragedy by William Shakespeare.',
    url: 'https://en.wikipedia.org/wiki/Macbeth',
    category: 'tragedy'
  },
  {
    id: 'item-3',
    title: 'The Tempest',
    description: 'The Tempest is a play by English playwright William Shakespeare, probably written in 1610–1611, ' +
      'and thought to be one of the last plays that Shakespeare wrote alone.',
    url: 'https://en.wikipedia.org/wiki/The_Tempest',
    category: 'comedy'
  },
  {
    id: 'item-4',
    title: 'The Seagull',
    description: 'The Seagull is a play by Russian dramatist Anton Chekhov, written in 1895.',
    url: 'https://en.wikipedia.org/wiki/The_Seagull',
    category: 'tragedy'
  }
];

describe('TextIndex', () => {
  test('indexer query', async () => {
    const getter = (item: any, key: string) => item[key];
    const indexer = new TextIndex({ fields: ['title', 'description'], getter });

    indexer.update(items);
    const results = indexer.search('william');
    expect(results.filter(item => ['item-0', 'item-1', 'item-2', 'item-3'].indexOf(item.id) !== -1)).toHaveLength(4);
  });

  test('indexer query with update cache', async () => {
    const getter = (item: any, key: string) => item[key];
    const indexer = new TextIndex({ fields: ['title', 'description'], getter });

    {
      indexer.update(items);
      const results = indexer.search('william');
      expect(results.filter(item => ['item-0', 'item-1', 'item-2', 'item-3'].indexOf(item.id) !== -1)).toHaveLength(4);
    }

    {
      indexer.update(items.slice(3, 4));
      const results = indexer.search('william');
      expect(results.filter(item => ['item-3'].indexOf(item.id) !== -1)).toHaveLength(1);
    }
  });

  test('simple text query', () => {
    const getter = (item: any, key: string) => item[key];
    const textIndex = new TextIndex({ fields: ['title', 'description'], getter });
    const matcher = new Matcher({ getter, textIndex });

    const query = {
      root: {
        op: Predicate.Operation.TEXT_MATCH,
        value: {
          string: 'william'
        }
      }
    };

    textIndex.update(items);
    const results = matcher.matchItems(query, items);
    expect(results.filter(item => ['item-0', 'item-1', 'item-2', 'item-3'].indexOf(item.id) !== -1)).toHaveLength(4);
  });

  test('complex text query', () => {
    const getter = (item: any, key: string) => item[key];
    const textIndex = new TextIndex({ fields: ['title', 'description'], getter });
    const matcher = new Matcher({ getter, textIndex });

    const query = {
      root: {
        op: Predicate.Operation.AND,
        predicates: [
          {
            op: Predicate.Operation.TEXT_MATCH,
            value: {
              string: 'william'
            }
          },
          {
            op: Predicate.Operation.NOT,
            predicates: [
              {
                op: Predicate.Operation.IN,
                key: 'category',
                value: {
                  array: {
                    values: [
                      {
                        string: 'comedy'
                      },
                      {
                        string: 'history'
                      }
                    ]
                  }
                }
              }
            ]
          }
        ]
      }
    };

    textIndex.update(items);
    const results = matcher.matchItems(query, items);
    expect(results.filter(item => ['item-1', 'item-2'].indexOf(item.id) !== -1)).toHaveLength(2);
  });
});
