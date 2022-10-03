//
// Copyright 2020 DXOS.org
//

import { Predicate, Query } from '@dxos/protocols/proto/dxos/echo/model/object';

import { ValueUtil } from './mutation';
import { TextIndex } from './text-index';

export type Getter = (item: any, path: string) => any;

interface MatcherOptions {
  getter: Getter
  textIndex?: TextIndex
}

/**
 * Predicate matcher.
 * NOTE: The approach here is to match items against the DNF predicate tree.
 */
export class Matcher {
  constructor (
    private readonly _options: MatcherOptions
  ) {}

  getFilter (query: Query) {
    return (item: any) => this._matchItem(item, query.root!);
  }

  /**
   * Returns list of matched items.
   */
  // TODO(burdon): Async API?
  matchItems (query: Query, items: any[]) {
    return items.filter(item => this._matchItem(item, query.root!));
  }

  /**
   * Recursively match predicate tree against current item.
   */
  _matchItem (item: any, predicate: Predicate): boolean {
    const { getter } = this._options;

    switch (predicate.op) {
      //
      // Boolean operators.
      //

      case Predicate.Operation.OR: {
        return predicate.predicates!.findIndex((predicate: Predicate) => this._matchItem(item, predicate)) !== -1;
      }

      case Predicate.Operation.AND: {
        return predicate.predicates!.findIndex((predicate: Predicate) => !this._matchItem(item, predicate)) === -1;
      }

      case Predicate.Operation.NOT: { // NAND.
        return predicate.predicates!.findIndex((predicate: Predicate) => !this._matchItem(item, predicate)) !== -1;
      }

      //
      // Equivalence.
      //

      case Predicate.Operation.IN: {
        const values = ValueUtil.valueOf(predicate.value!) || [];
        const value = getter(item, predicate.key!);
        return value && values.indexOf(value) !== -1;
      }

      case Predicate.Operation.EQUALS: {
        const value = getter(item, predicate.key!);
        return value === ValueUtil.valueOf(predicate.value!);
      }

      case Predicate.Operation.PREFIX_MATCH: {
        const value = getter(item, predicate.key!);
        if (typeof value === 'string') {
          const match = ValueUtil.valueOf(predicate.value!)?.toLowerCase();
          return match && value.toLowerCase().indexOf(match) === 0;
        }
        break;
      }

      case Predicate.Operation.TEXT_MATCH: {
        const text = ValueUtil.valueOf(predicate.value!)?.trim().toLowerCase();
        if (!text) {
          break;
        }

        // Match text against cached text index.
        if (this._options.textIndex) {
          const matches = this._options.textIndex.search(text);
          return matches.findIndex(match => match.id === item.id) !== -1;
        }

        // Match text against each word.
        const value = getter(item, predicate.key!);
        if (typeof value === 'string') {
          const words = value.toLowerCase().split(/\s+/);
          return words.findIndex(word => word.indexOf(text) === 0) !== -1;
        }
        break;
      }
    }

    return false;
  }
}
