//
// Copyright 2026 DXOS.org
//

import { Entity, Filter, Obj, Query } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import { type SearchResult } from '@dxos/react-ui-search';
import { Text } from '@dxos/schema';

import { mapObjectToTextFields } from './sync';

/** Fallback for a type that declares no `IconAnnotation` — the same one the nav tree and cards use. */
const DEFAULT_ICON = 'ph--circle-dashed--regular';

/** Full-text search filter over the FTS5 index. */
export const buildSearchFilter = (text: string): Filter.Any => Filter.text(text, { type: 'full-text' });

/**
 * Build the ECHO query for a search box value. Empty input matches nothing. A term routes to
 * the FTS index, scoped to `typeUris` when given: the whole-object-JSON index has no per-field
 * choice yet, so without a scope it surfaces objects the app never renders (views, stored
 * schemas, relation rows). An empty scope also matches nothing — the caller not having resolved
 * its visible types yet must not flash unscoped results.
 */
export const buildSearchQuery = (text: string | undefined, typeUris?: readonly URI.URI[]): Query.Any => {
  const trimmed = text?.trim();
  if (!trimmed || (typeUris && typeUris.length === 0)) {
    return Query.select(Filter.nothing());
  }
  if (!typeUris) {
    return Query.select(buildSearchFilter(trimmed));
  }
  return Query.select(
    Filter.and(buildSearchFilter(trimmed), Filter.or(...typeUris.map((typeUri) => Filter.type(typeUri)))),
  );
};

/**
 * Presentation ordering for already-matched results: exact label, then prefix, then
 * substring, then shorter labels first. The FTS index does the semantic matching;
 * this only orders what it returned. (Exposing the engine's BM25 rank is a follow-up.)
 */
export const byRelevance =
  (query: string) =>
  (a: { label?: string }, b: { label?: string }): number => {
    const trimmedQuery = query.trim();
    const needle = trimmedQuery.toLowerCase();
    const rank = (label?: string): number => {
      const value = (label ?? '').toLowerCase();
      if (value === needle) {
        return 0;
      }
      if (value.startsWith(needle)) {
        return 1;
      }
      if (value.includes(needle)) {
        return 2;
      }
      return 3;
    };
    const byRank = rank(a.label) - rank(b.label);
    if (byRank !== 0) {
      return byRank;
    }
    // Case-insensitive rank alone can tie two differently-cased matches (e.g. "al" vs "Al");
    // prefer the one that matches the query's exact case.
    const exactCase = (label?: string): number => ((label ?? '') === trimmedQuery ? 0 : 1);
    const byExactCase = exactCase(a.label) - exactCase(b.label);
    if (byExactCase !== 0) {
      return byExactCase;
    }
    return (a.label?.length ?? 0) - (b.label?.length ?? 0);
  };

/**
 * Map FTS-matched ECHO objects to ranked search results. Text objects are dropped
 * (they carry no independent label and are indexed via their host object).
 */
export const toSearchResults = <T extends Entity.Unknown>(objects: T[], text: string): SearchResult<T>[] => {
  const results = objects.reduce<SearchResult<T>[]>((acc, object) => {
    if (Obj.instanceOf(Text.Text, object)) {
      return acc;
    }
    const label = Entity.getLabel(object);
    // TODO(burdon): Use schema for the snippet too (mapObjectToTextFields flattens every string prop).
    const fields = mapObjectToTextFields(object);
    const snippet = fields.content ?? fields.description ?? Object.values(fields).find((value) => value !== label);
    acc.push({
      id: object.id,
      // Same type-annotation icon the nav tree and cards resolve, so a result reads as the object it is;
      // always set, so every row aligns whether or not its type declares one.
      icon: Entity.getIcon(object)?.icon ?? DEFAULT_ICON,
      label,
      snippet,
      object,
    });
    return acc;
  }, []);
  return results.sort(byRelevance(text));
};
