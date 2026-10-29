//
// Copyright 2026 DXOS.org
//

import { Filter, type QueryAST } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';
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

/** Whether the filter is nothing but root tag terms (`#a`, `#a #b`), which resolve wholly to ids. */
const isTagsOnly = (ast: QueryAST.Filter): boolean =>
  ast.type === 'tag' || (ast.type === 'and' && ast.filters.every(isTagsOnly));

/** The root-level tag uris of a parsed filter - the tags {@link buildSearchSelection} can resolve to member ids. */
export const getFilterTagUris = (filter: Filter.Any | undefined): string[] =>
  filter ? collectRootTagUris(filter.ast) : [];

/** The free-text term from a parsed filter (the first text-search node), or undefined. */
export const getSearchText = (filter: Filter.Any | undefined): string | undefined => {
  return filter && findTextSearch(filter.ast)?.text;
};

export type SearchSelectionOptions = {
  /**
   * Member ids for a tag uri, from the owner's `TagIndex` - feed objects carry no `meta.tags` of
   * their own, so a tag term can only select them by becoming an id selection. Returning undefined
   * drops that tag term.
   */
  resolveTagIds?: (tagUri: string) => readonly EntityId[] | undefined;
};

/**
 * Build a list's view filter from its filter box, narrowing `base` (the listed type).
 *
 * Free text composes with `base` and, via {@link SearchSelectionOptions.resolveTagIds}, with the
 * members of any root tag terms, so a term typed inside a tag view searches within it; tag terms
 * alone select their members the same way.
 * Other structural terms are still dropped from a mixed query (predicate search is tracked in
 * plugin-search TASKS.md).
 */
export const buildSearchSelection = (
  base: Filter.Any,
  filterText: string,
  filter: Filter.Any | undefined,
  options?: SearchSelectionOptions,
): Filter.Any => {
  if (filterText.trim().length === 0 || !filter) {
    return base;
  }
  const members = resolveTagMembers(filter, options);
  const textSearch = findTextSearch(filter.ast);
  if (textSearch) {
    const text = Filter.text(textSearch.text, { type: 'full-text' });
    return members ? Filter.and(base, members, text) : Filter.and(base, text);
  }
  // A bare `Filter.tag` never matches a feed object, so tag-only input must select by member id.
  if (members && isTagsOnly(filter.ast)) {
    return Filter.and(base, members);
  }
  return Filter.and(base, filter);
};

/**
 * The id selection for the filter's root tag terms, intersected across tags, or undefined when none
 * resolve. `Filter.id()` of an empty intersection is `Filter.nothing()`: a tag with no members matches
 * nothing.
 */
const resolveTagMembers = (filter: Filter.Any, options?: SearchSelectionOptions): Filter.Any | undefined => {
  const idSets = collectRootTagUris(filter.ast)
    .map((tagUri) => options?.resolveTagIds?.(tagUri))
    .filter(isNonNullable);
  if (idSets.length === 0) {
    return undefined;
  }
  // Set membership per list, not `includes`: a system tag's membership can run to the whole feed,
  // and this intersects on every debounced keystroke.
  const [first, ...rest] = idSets;
  const memberIds = rest.reduce<readonly EntityId[]>((acc, ids) => {
    const candidates = new Set(ids);
    return acc.filter((id) => candidates.has(id));
  }, first);
  return Filter.id(...memberIds);
};
