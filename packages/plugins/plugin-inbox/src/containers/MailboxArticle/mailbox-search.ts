//
// Copyright 2026 DXOS.org
//

import { Filter, Query, type QueryAST } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';
import { isNonNullable } from '@dxos/util';

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

/** Tag uris AND-composed at the filter's root. Tags under `or`/`not` cannot be soundly rewritten to id selections. */
const collectRootTagUris = (ast: QueryAST.Filter): string[] => {
  switch (ast.type) {
    case 'tag':
      return [ast.tag];
    case 'and':
      return ast.filters.flatMap(collectRootTagUris);
    default:
      return [];
  }
};

/** The root-level tag uris of a parsed filter — the tags {@link buildMailboxSelection} can resolve to member ids. */
export const getFilterTagUris = (filter: Filter.Any | undefined): string[] =>
  filter ? collectRootTagUris(filter.ast) : [];

export type MailboxSelectionOptions = {
  /**
   * Member ids for a tag uri, from the mailbox's `TagIndex`. Feed messages carry no `meta.tags` of
   * their own — membership lives in the `TagIndex` — so a text search can only stay scoped to a tag
   * view by rewriting its tag terms to id selections. Returning undefined (or omitting the
   * resolver) drops that tag term from the text selection, as before.
   */
  resolveTagIds?: (tagUri: string) => readonly EntityId[] | undefined;
};

/**
 * Build the message-list view filter from the mailbox search box: messages matching this filter are
 * what qualify a thread for the list (see {@link buildThreadSemiJoin}).
 *
 * Free-text search routes to the FTS index, composed with the message type — and, in a tag view,
 * with the tag's members: root tag terms are rewritten to `TagIndex` id selections (intersected
 * when several) via {@link MailboxSelectionOptions.resolveTagIds}, so typing a term inside a tag
 * view searches within it. Structural terms other than tags are still dropped from a mixed query
 * (predicate search is tracked in plugin-search TASKS.md). Structural-only filters (`from:`,
 * `#tag`) compose with the message type as before.
 */
export const buildMailboxSelection = (
  filterText: string,
  filter: Filter.Any | undefined,
  options?: MailboxSelectionOptions,
): Filter.Any => {
  const base = Filter.type(Message.Message);
  if (filterText.trim().length === 0 || !filter) {
    return base;
  }
  const textSearch = findTextSearch(filter.ast);
  if (textSearch) {
    const text = Filter.text(textSearch.text, { type: 'full-text' });
    const idSets = collectRootTagUris(filter.ast)
      .map((tagUri) => options?.resolveTagIds?.(tagUri))
      .filter(isNonNullable);
    if (idSets.length === 0) {
      return Filter.and(base, text);
    }
    const [first, ...rest] = idSets;
    const memberIds = rest.reduce((acc, set) => acc.filter((id) => set.includes(id)), first);
    // `Filter.id()` of an empty intersection is `Filter.nothing()`: a tag with no members matches nothing.
    return Filter.and(base, Filter.id(...memberIds), text);
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
