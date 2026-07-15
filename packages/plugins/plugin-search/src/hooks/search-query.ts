//
// Copyright 2026 DXOS.org
//

import { Entity, Filter, Obj, Query } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { type SearchResult } from '#types';

import { getIcon, mapObjectToTextFields } from './sync';

/** A character span within a field value, for highlighting. */
export type MatchSpan = { start: number; end: number };

/** Full-text search filter over the FTS5 index. */
export const buildSearchFilter = (text: string): Filter.Any => Filter.text(text, { type: 'full-text' });

/**
 * Build the ECHO query for a search box value. Empty input matches nothing; a term
 * routes to the FTS index via a single text-search select (never combined with a
 * type filter — that composition is unsupported by the executor).
 */
export const buildSearchQuery = (text: string | undefined): Query.Any => {
  const trimmed = text?.trim();
  return trimmed ? Query.select(buildSearchFilter(trimmed)) : Query.select(Filter.nothing());
};

/** Case-insensitive, non-overlapping occurrences of `query` within `value`. */
export const computeMatchSpans = (value: string, query: string): MatchSpan[] => {
  const spans: MatchSpan[] = [];
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return spans;
  }
  const haystack = value.toLowerCase();
  let from = 0;
  for (;;) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) {
      break;
    }
    spans.push({ start: index, end: index + needle.length });
    from = index + needle.length;
  }
  return spans;
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
    // TODO(burdon): Use schema (matches the pre-existing pattern in sync.ts's filterObjectsSync).
    const label = Obj.getLabel(object as any);
    const fields = mapObjectToTextFields(object);
    const snippet = fields.content ?? fields.description ?? Object.values(fields).find((value) => value !== label);
    acc.push({
      id: object.id,
      icon: getIcon(Entity.getType(object)),
      label,
      snippet,
      object,
    });
    return acc;
  }, []);
  return results.sort(byRelevance(text));
};
