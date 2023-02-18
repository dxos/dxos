//
// Copyright 2020 DXOS.org
//

import MiniSearch from 'minisearch';

import { Getter } from './matcher';

interface IndexerOptions {
  fields: string[];
  getter: Getter;
}

/**
 * Caching text search.
 */
export class TextIndex {
  private readonly _minisearch: MiniSearch;

  private readonly _cache = new Map<string, any[]>();

  private _items: any[] = [];

  constructor({ fields, getter }: IndexerOptions) {
    // https://lucaong.github.io/minisearch/classes/_minisearch_.minisearch.html#options-and-defaults
    this._minisearch = new MiniSearch({
      idField: 'id',
      fields,
      extractField: getter
    });
  }

  // TODO(burdon): Monitor memory usage and timing.
  // TODO(burdon): Calcuate diff.
  update(items: any[]) {
    this._items = items;
    this._minisearch.removeAll();
    this._minisearch.addAll(items);
    this._cache.clear();
    return this;
  }

  // TODO(burdon): Async API?
  search(text: string) {
    let results = this._cache.get(text);
    if (!results) {
      results = this._minisearch.search(text).map((result) => ({
        ...result,
        item: this._items.find((item) => item.id === result.id)
      }));

      this._cache.set(text, results);
    }

    return results;
  }
}
