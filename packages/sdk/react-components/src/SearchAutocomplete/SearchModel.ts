//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';

// NOTE: Label must be unique.
export type SearchResult = { id: string, label: string }

/**
 * Text search interface.
 */
export interface SearchModel {
  // Get current results.
  results: SearchResult[]

  // Returns unsubscribe method.
  subscribe: (callback: (results: SearchResult[]) => void) => void

  // Set text filter.
  setFilter: (text: string) => void
}

/**
 * Simple text search model.
 */
export class TextSearchModel implements SearchModel {
  _update = new Event<SearchResult[]>();
  _results: SearchResult[] = [];
  _timeout?: ReturnType<typeof setTimeout>;

  constructor (
    private readonly _values: SearchResult[],
    private readonly _delay = 500
  ) {}

  get results () {
    return this._results;
  }

  subscribe (callback: (results: SearchResult[]) => void) {
    return this._update.on(callback);
  }

  setFilter (text: string) {
    const str = text.trim().toLowerCase();
    this._timeout && clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      this._results = [];
      if (str.length) {
        const match = new Set<string>();
        this._values.forEach(value => {
          const label = value.label.toLowerCase();
          if (label.indexOf(str) === 0 && !match.has(value.label)) {
            this._results.push(value);
            match.add(label);
          }
        });

        this._results.sort(({ label: a }, { label: b }) => a < b ? -1 : a > b ? 1 : 0);
      }

      this._update.emit(this._results);
    }, this._delay);
  }
}
