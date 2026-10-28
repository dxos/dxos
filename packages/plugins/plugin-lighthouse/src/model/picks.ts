//
// Copyright 2026 DXOS.org
//

import { type Entity, type Pick } from '../client/types.ts';
import { isResult, isThin, urlOf } from './results.ts';

/** A pick in the agent's report, with the graph subject it names when one matches. */
export type MatchedPick = { pick: Pick; index: number; entity?: Entity };

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * Matches the report's picks to the results they name: by subject IRI, else by name (a finding's URL is often the
 * article it came from, shared by several picks), else by URL. Ported from lighthouse's web UI SessionView.
 */
export const matchPicks = (picks: readonly Pick[], results: readonly Entity[]): MatchedPick[] => {
  const byKey = new Map<string, Entity>();
  // Real results win over the search-result entries that point at them (same URL).
  const ordered = [...results].sort(
    (a, b) => Number(isResult(a)) - Number(isResult(b)) || Number(!isThin(a)) - Number(!isThin(b)),
  );
  for (const entity of ordered) {
    byKey.set(entity.id, entity);
    const url = urlOf(entity);
    if (url) {
      byKey.set(url, entity);
    }
    for (const value of [...(entity.props['schema:url'] ?? []), ...(entity.props['schema:sameAs'] ?? [])]) {
      if (typeof value === 'string') {
        byKey.set(value, entity);
      }
    }
  }

  const real = results.filter((entity) => isResult(entity) && !isThin(entity));
  const byName = (title: string) => {
    const head = normalize(title.split(/\s[—–-]\s|:|\(/)[0] ?? title);
    if (head.length < 3) {
      return undefined;
    }
    return real.find((entity) => {
      const name = normalize(String(entity.props['schema:name']?.[0] ?? ''));
      return name.length >= 3 && (name === head || head.startsWith(name) || name.startsWith(head));
    });
  };
  const keyed = (key?: string) => {
    const entity = key ? byKey.get(key) : undefined;
    return entity && isResult(entity) ? entity : undefined;
  };

  return picks.map((pick, index) => ({
    pick,
    index,
    entity: keyed(pick.subject) ?? byName(pick.title) ?? keyed(pick.url),
  }));
};

/** The identity a kept Finding is deduplicated by: the subject it names, else the pick's URL or title. */
export const pickKey = ({ pick, entity }: MatchedPick): string => entity?.id ?? pick.subject ?? pick.url ?? pick.title;

/** Picks whose key is not among the already kept ones, in report order (SyncFindings appends these). */
export const newPicks = (picks: readonly MatchedPick[], kept: ReadonlySet<string>): MatchedPick[] => {
  const seen = new Set(kept);
  return picks.filter((pick) => {
    const key = pickKey(pick);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};
