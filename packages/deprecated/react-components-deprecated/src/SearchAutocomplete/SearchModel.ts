//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';

/**
 * Search result.
 */
// TODO(burdon): Make extensible.
export type SearchResult<T> = {
  id: string;
  type?: string;
  text: string;
  value: T;
};

export type Filter<T> = (value: T) => boolean;

/**
 * Text search interface.
 */
export interface SearchModel<T> {
  // Get current results.
  results: SearchResult<T>[];

  // Returns unsubscribe method.
  subscribe: (callback: (results: SearchResult<T>[]) => void) => void;

  // Set text filter.
  setText: (text: string) => void;
}

/**
 * Simple text search model.
 */
export class TextSearchModel<T> implements SearchModel<T> {
  _update = new Event<SearchResult<T>[]>();
  _results: SearchResult<T>[] = [];
  _timeout?: ReturnType<typeof setTimeout>;

  constructor(private readonly _values: SearchResult<T>[], private readonly _delay = 500) {}

  get results() {
    return this._results;
  }

  subscribe(callback: (results: SearchResult<T>[]) => void) {
    return this._update.on(callback);
  }

  setText(text: string) {
    const str = text.trim().toLowerCase();
    this._timeout && clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      this._results = [];
      if (str.length) {
        const match = new Set<string>();
        this._values.forEach((value) => {
          const label = value.text.toLowerCase();
          if (label.indexOf(str) === 0 && !match.has(label)) {
            this._results.push(value);
            match.add(label);
          }
        });

        this._results.sort(({ text: a }, { text: b }) => (a < b ? -1 : a > b ? 1 : 0));
      }

      this._update.emit(this._results);
    }, this._delay);
  }
}
