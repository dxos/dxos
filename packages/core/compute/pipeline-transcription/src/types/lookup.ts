//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Obj, Query, Ref } from '@dxos/echo';

/**
 * A candidate match for a surface noun: the matched object's id, a ref consumers can persist, and a
 * relevance `score` (higher = better) from the search backend's match rank.
 */
export type EntityMatch = {
  id: string;
  ref: Ref.Ref<any>;
  score: number;
};

/**
 * Additional context that narrows a lookup. Grows over time (e.g. the conversation window, an
 * expected role); backends ignore fields they do not support.
 */
export type LookupContext = {
  /** Restrict matches to these typenames (e.g. the typename of `Person` / `Organization`). */
  types?: string[];
};

/**
 * Resolves a surface noun to its candidate matches, ranked best-first, backed by an index. The
 * pipeline depends only on this function — not on ECHO/the database directly — so the backend
 * (full-text, vector, a remote service, …) is an injected concern. Returning candidates (rather than
 * a single match) lets a context-aware resolver disambiguate using the surrounding conversation.
 * Empty when nothing matches.
 */
export type EntityLookup = (noun: string, context?: LookupContext) => Promise<EntityMatch[]>;

export type DatabaseLookupOptions = {
  /** Search backend. Full-text matches proper nouns precisely; vector matches semantically. */
  searchKind?: 'full-text' | 'vector';
  /** Maximum candidates returned per noun. */
  limit?: number;
};

/** An {@link EntityLookup} backed by an ECHO database query (full-text by default). */
export const makeDatabaseLookup =
  (db: Database.Database, { searchKind = 'full-text', limit = 5 }: DatabaseLookupOptions = {}): EntityLookup =>
  async (noun, context) => {
    // `runEntries` exposes each match's relevance rank; `run` would discard it.
    const entries = await db.query(Query.select(Filter.text(noun, { type: searchKind }))).runEntries();
    // Type narrowing is applied here rather than in the query: the executor rejects a text-search
    // filter combined with a type filter ("query too complex").
    const types = context?.types;
    return entries
      .flatMap((entry) => {
        if (!entry.result || (types?.length && !types.includes(Obj.getTypename(entry.result) ?? ''))) {
          return [];
        }
        return [{ id: entry.id, ref: Ref.make(entry.result), score: entry.match?.rank ?? 0 }];
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  };
