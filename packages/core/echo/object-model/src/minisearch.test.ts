//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import MiniSearch from 'minisearch';

describe('Search', function () {
  it('minisearch', async function () {
    // https://lucaong.github.io/minisearch/classes/_minisearch_.minisearch.html
    const miniSearch = new MiniSearch({
      idField: 'id',
      fields: ['title', 'text'],
      storeFields: ['title', 'category']
    });

    const documents = [
      {
        id: 1,
        title: 'Moby Dick',
        text: 'Call me Ishmael. Some years ago...',
        category: 'fiction'
      },
      {
        id: 2,
        title: 'Zen and the Art of Motorcycle Maintenance',
        text: 'I can see by my watch...',
        category: 'fiction'
      },
      {
        id: 3,
        title: 'Neuromancer',
        text: 'The sky above the port was...',
        category: 'fiction'
      },
      {
        id: 4,
        title: 'Zen and the Art of Archery',
        text: 'At first sight it must seem...',
        category: 'non-fiction'
      }
    ];

    miniSearch.addAll(documents);

    {
      const results = miniSearch.search('zen art motorcycle');
      expect(results).toHaveLength(2);
    }

    {
      const results = miniSearch.autoSuggest('neu');
      expect(results).toHaveLength(1);
    }

    miniSearch.addAll([
      {
        id: 1,
        title: 'Moby Dick',
        text: 'This book was way too long.',
        category: 'fiction'
      }
    ]);

    {
      const results = miniSearch.search('too long');
      expect(results).toHaveLength(1);
    }
  });
});
