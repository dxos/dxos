//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { type QueryAST } from '@dxos/echo';
import { type URI } from '@dxos/keys';

// Helper to extract type URI from query AST
export const extractTypename = (query: QueryAST.Query): Option.Option<URI.URI> => {
  return Match.value(query).pipe(
    Match.withReturnType<Option.Option<URI.URI>>(),
    Match.when({ type: 'select' }, (q) => extractTypenameFromFilter(q.filter)),
    Match.when({ type: 'filter' }, (q) => {
      const selectionTypename = extractTypename(q.selection);
      const filterTypename = extractTypenameFromFilter(q.filter);
      return Option.isSome(selectionTypename) ? selectionTypename : filterTypename;
    }),
    Match.when({ type: 'options' }, (q) => extractTypename(q.query)),
    Match.when({ type: 'from' }, (q) => extractTypename(q.query)),
    Match.when({ type: 'order' }, (q) => extractTypename(q.query)),
    Match.when({ type: 'limit' }, (q) => extractTypename(q.query)),
    Match.orElse(() => Option.none()),
  );
};

// Helper to extract tag from query AST
export const extractTag = (query: QueryAST.Query): Option.Option<string> => {
  return Match.value(query).pipe(
    Match.withReturnType<Option.Option<string>>(),
    Match.when({ type: 'select' }, (q) => extractTagFromFilter(q.filter)),
    Match.when({ type: 'filter' }, (q) => {
      const selectionTag = extractTag(q.selection);
      const filterTag = extractTagFromFilter(q.filter);
      return Option.isSome(filterTag) ? filterTag : selectionTag;
    }),
    Match.when({ type: 'options' }, (q) => extractTag(q.query)),
    Match.when({ type: 'from' }, (q) => extractTag(q.query)),
    Match.when({ type: 'order' }, (q) => extractTag(q.query)),
    Match.when({ type: 'limit' }, (q) => extractTag(q.query)),
    Match.orElse(() => Option.none()),
  );
};

// Helper to extract type URI from filter AST
const extractTypenameFromFilter = (filter: QueryAST.Filter): Option.Option<URI.URI> => {
  return Match.value(filter).pipe(
    Match.withReturnType<Option.Option<URI.URI>>(),
    Match.when({ type: 'object' }, (f) => Option.fromNullable(f.typename)),
    Match.when({ type: 'and' }, (f) =>
      f.filters.reduce(
        (acc: Option.Option<URI.URI>, filterItem: QueryAST.Filter) =>
          Option.isSome(acc) ? acc : extractTypenameFromFilter(filterItem),
        Option.none<URI.URI>(),
      ),
    ),
    Match.when({ type: 'or' }, (f) =>
      f.filters.reduce(
        (acc: Option.Option<URI.URI>, filterItem: QueryAST.Filter) =>
          Option.isSome(acc) ? acc : extractTypenameFromFilter(filterItem),
        Option.none<URI.URI>(),
      ),
    ),
    Match.orElse(() => Option.none()),
  );
};

// Helper to extract tag from filter AST
const extractTagFromFilter = (filter: QueryAST.Filter): Option.Option<string> => {
  return Match.value(filter).pipe(
    Match.withReturnType<Option.Option<string>>(),
    Match.when({ type: 'tag' }, (f) => Option.some(f.tag)),
    Match.when({ type: 'and' }, (f) =>
      f.filters.reduce(
        (acc: Option.Option<string>, filterItem: QueryAST.Filter) =>
          Option.isSome(acc) ? acc : extractTagFromFilter(filterItem),
        Option.none<string>(),
      ),
    ),
    Match.when({ type: 'or' }, (f) =>
      f.filters.reduce(
        (acc: Option.Option<string>, filterItem: QueryAST.Filter) =>
          Option.isSome(acc) ? acc : extractTagFromFilter(filterItem),
        Option.none<string>(),
      ),
    ),
    Match.orElse(() => Option.none()),
  );
};
