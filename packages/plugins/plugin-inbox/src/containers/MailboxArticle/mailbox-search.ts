//
// Copyright 2026 DXOS.org
//

import { type Feed, Filter, Query, QueryAST } from '@dxos/echo';
import { Message } from '@dxos/types';

/** Whether the filter AST contains a text-search node anywhere. */
const findTextSearch = (ast: QueryAST.Filter): QueryAST.FilterTextSearch | undefined => {
  switch (ast.type) {
    case 'text-search':
      return ast;
    case 'and':
    case 'or':
      return ast.filters.map(findTextSearch).find(Boolean);
    case 'not':
      return findTextSearch(ast.filter);
    default:
      return undefined;
  }
};

/**
 * The mailbox's view filter (from its search box): messages matching this filter are what
 * qualify a thread for the list, before the whole-thread semi-join is applied.
 *
 * The query executor cannot combine a text-search with any other root filter via AND
 * (it throws "Query too complex"), so free-text search routes to a lone full-text
 * select over the message feed — the message type is implied by the feed scope.
 * Structural-only filters (`from:`, `#tag`) compose with the message type as normal.
 * Mixed text + structural is not supported in this milestone; the text wins and the
 * structural part is dropped (tracked for Milestone 3).
 */
const buildMailboxViewFilter = (filterText: string, filter: Filter.Any | undefined): Filter.Any => {
  const base = Filter.type(Message.Message);
  if (filterText.trim().length === 0 || !filter) {
    return base;
  }
  const textSearch = findTextSearch(filter.ast);
  if (textSearch) {
    return Filter.text(textSearch.text, { type: 'full-text' });
  }
  return Filter.and(base, filter);
};

/**
 * Build the message-list selection from the mailbox search box: a thread qualifies if ANY of
 * its messages match the view filter (see {@link buildMailboxViewFilter}), and the selection
 * pulls in every message sharing that thread's `threadId` — an uncorrelated
 * `threadId IN (SELECT threadId FROM feed WHERE <viewFilter>)` semi-join — so callers see whole
 * threads, not only the filter-matching members.
 */
export const buildMailboxSelection = (
  filterText: string,
  filter: Filter.Any | undefined,
  feed: Feed.Feed,
): Filter.Any => {
  const viewFilter = buildMailboxViewFilter(filterText, filter);
  const matches = Query.select(viewFilter).from(feed);
  return Filter.type(Message.Message, { threadId: Filter.in(matches.project('threadId')) });
};

/** The free-text term from a parsed filter (the first text-search node), or undefined. */
export const getSearchText = (filter: Filter.Any | undefined): string | undefined => {
  return filter && findTextSearch(filter.ast)?.text;
};
