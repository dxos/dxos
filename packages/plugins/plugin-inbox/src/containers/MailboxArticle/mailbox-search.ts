//
// Copyright 2026 DXOS.org
//

import { Filter, Query, type QueryAST } from '@dxos/echo';
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
 * Build the message-list view filter from the mailbox search box: messages matching this filter are
 * what qualify a thread for the list (see {@link buildThreadSemiJoin}).
 *
 * Free-text search routes to a lone full-text select over the message feed — the message
 * type is implied by the feed scope. Structural-only filters (`from:`, `#tag`) compose with
 * the message type as normal. Mixed text + structural still drops the structural part here:
 * the executor now supports AND-ing a text-search with type/props filters, but adopting the
 * composition in the mailbox is tracked for plugin-search Milestone 3.
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

/**
 * Wraps a view filter (from {@link buildMailboxSelection} or {@link buildSystemTagSelection}) in the
 * whole-thread semi-join: a thread qualifies if ANY of its messages match `viewFilter`, and the
 * returned query then selects EVERY message sharing that thread's `threadId` — an uncorrelated
 * `threadId IN (SELECT threadId FROM ... WHERE <viewFilter>)` semi-join — so callers see whole
 * threads, not only the directly-matching members.
 *
 * The result is a UNION of that semi-join with the directly-matching messages, because a message with
 * no `threadId` satisfies neither side of the semi-join and would otherwise never appear — see the
 * comment on the union below.
 *
 * `matchesScope` is the *subquery's* scope — which messages are eligible to qualify a thread — and
 * may differ from the outer query's own scope. For example, the free-text view filter only ever
 * matches feed messages (too complex to also scope free text across the whole space), while a
 * system-tag selection's ids may resolve on either side. Callers apply their own `.from(scopes)` to
 * the returned query (the outer, thread-pulling scope) before continuing the chain
 * (`.orderBy()`/`.aggregate()`/`.limit()`); that scope reaches both arms of the union.
 */
export const buildThreadSemiJoin = (
  viewFilter: Filter.Any,
  matchesScope: QueryAST.Scope | QueryAST.Scope[],
): Query.Query<Message.Message> => {
  const matches = Query.select(viewFilter).from(matchesScope);
  const wholeThreads = Query.select(Filter.type(Message.Message, { threadId: Filter.in(matches.project('threadId')) }));
  // Unioned with the direct matches because a message with no `threadId` can satisfy neither side of
  // the semi-join — it has no id to be found by, and it projects nothing into the subquery — so it
  // would vanish from the list entirely. Drafts, transcriptions and assistant-authored messages all
  // take that shape. A threadless match therefore stands in for its own thread. Threaded messages
  // match both arms; the union de-duplicates by id.
  return Query.all(wholeThreads, Query.select(viewFilter));
};
