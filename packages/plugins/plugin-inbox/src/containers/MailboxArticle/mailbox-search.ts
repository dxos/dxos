//
// Copyright 2026 DXOS.org
//

import { Filter, QueryAST } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';
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
 * Build the message-list selection from the mailbox search box.
 *
 * The query executor cannot combine a text-search with any other root filter via AND
 * (it throws "Query too complex"), so free-text search routes to a lone full-text
 * select over the message feed — the message type is implied by the feed scope.
 * Structural-only filters (`from:`, `#tag`) compose with the message type as normal.
 * Mixed text + structural is not supported in this milestone; the text wins and the
 * structural part is dropped (tracked for Milestone 3).
 */
export const buildMailboxSelection = (filterText: string, filter: Filter.Any | undefined): Filter.Any => {
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

/** The free-text term from a parsed filter (the first text-search node), or undefined. */
export const getSearchText = (filter: Filter.Any | undefined): string | undefined => {
  return filter && findTextSearch(filter.ast)?.text;
};

/**
 * Selects messages carrying a system tag (Inbox/Sent/Draft), given member ids already resolved from
 * the mailbox's `TagIndex`. A bare `Filter.tag` can't do this — feed/drafts carry no `meta.tags` of
 * their own, membership lives in `TagIndex` instead — so selection is by id. Scope (`.from(...)`) is
 * the caller's job. An empty `ids` selects nothing (correct pre-sync/no-drafts-yet behavior).
 */
export const buildSystemTagSelection = (ids: readonly EntityId[]): Filter.Any =>
  ids.length === 0 ? Filter.nothing() : Filter.and(Filter.type(Message.Message), Filter.id(...ids));
