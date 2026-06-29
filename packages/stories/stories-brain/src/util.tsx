//
// Copyright 2026 DXOS.org
//

import { type Type } from '@dxos/semantic-index';
import { type ChromaticPalette, type MessageValence, type NeutralPalette } from '@dxos/ui-types';

export type Group = {
  subject: string;
  facts: Type.Fact[];
  conflicted: boolean;
  conflictedIds: Set<string>;
};

/** Group facts by subject entity and flag predicate-level conflicts within each group. */
export const groupFacts = (facts: Type.Fact[], filter: string): Group[] => {
  const needle = filter.trim().toLowerCase();
  const filtered = needle
    ? facts.filter((fact) => {
        const { subject, predicate, object } = fact.assertion;
        return [termLabel(subject), predicate, termLabel(object)].some((value) => value.toLowerCase().includes(needle));
      })
    : facts;

  const bySubject = new Map<string, Type.Fact[]>();
  for (const fact of filtered) {
    const key = termLabel(fact.assertion.subject);
    const list = bySubject.get(key) ?? [];
    list.push(fact);
    bySubject.set(key, list);
  }

  return [...bySubject.entries()].map(([subject, groupFactsList]) => {
    const byPredicate = new Map<string, Type.Fact[]>();
    for (const fact of groupFactsList) {
      const list = byPredicate.get(fact.assertion.predicate) ?? [];
      list.push(fact);
      byPredicate.set(fact.assertion.predicate, list);
    }

    const conflictedIds = new Set<string>();
    for (const list of byPredicate.values()) {
      const objects = new Set(list.map((fact) => termLabel(fact.assertion.object)));
      if (objects.size > 1) {
        for (const fact of list) {
          conflictedIds.add(fact.id);
        }
      }
    }

    return {
      subject,
      facts: groupFactsList,
      conflicted: conflictedIds.size > 0,
      conflictedIds,
    };
  });
};

export const termLabel = (term: Type.Term): string => ('entity' in term ? term.entity : term.literal);

/** Prettify entity ids for display; render literal values verbatim. */
export const formatTerm = (term: Type.Term): string => ('entity' in term ? humanize(term.entity) : term.literal);

/** Render ids like `q3-board-meeting` as `Q3 Board Meeting`. */
export const humanize = (value: string): string =>
  value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export const formatDate = (iso: string): string => iso.slice(0, 10);

/** Map FactBank factuality to a real react-ui palette member. */
export const factualityColor = (factuality: Type.Factuality): NeutralPalette | ChromaticPalette | MessageValence => {
  switch (factuality) {
    case 'CT+':
      return 'emerald';
    case 'PR+':
      return 'amber';
    case 'PS+':
      return 'sky';
    case 'CT-':
    case 'PR-':
    case 'PS-':
      return 'red';
    case 'CTu':
    case 'Uu':
    default:
      return 'neutral';
  }
};
