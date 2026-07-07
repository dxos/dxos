//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { FactStore, type SemanticIndexError, type SemanticQuery, type RDF as SemanticType } from '@dxos/pipeline-rdf';

/** A topic discussed across the corpus, ranked by reach (distinct agents) then volume. */
export type Topic = {
  /** Entity slug as stored in the fact graph. */
  readonly entity: string;
  /** Humanized label. */
  readonly label: string;
  /** Number of facts referencing this entity (as subject or object). */
  readonly mentions: number;
  /** Distinct agents who referenced it — reach, the FAQ/importance signal. */
  readonly agents: number;
  /** Sample source DXNs (up to 5) for drill-down. */
  readonly sources: readonly string[];
};

export type TopicReport = {
  readonly topics: readonly Topic[];
  readonly factCount: number;
};

export type TopicOptions = {
  /** Max topics to return (default 20). */
  readonly limit?: number;
  /** Drop topics with fewer than this many mentions (default 1). */
  readonly minMentions?: number;
};

const humanize = (slug: string) => slug.replace(/-/g, ' ');

const entityId = (term: SemanticType.Term): string | undefined => ('entity' in term ? term.entity : undefined);

/**
 * Aggregate the fact graph into a ranked list of topics. Entities that are themselves agents
 * (senders) are excluded so the result is "what was discussed", not "who discussed it". The output
 * drives querying — each topic's `entity` feeds `FactStore.query({ entity })`.
 */
export const extractTopics = (options?: TopicOptions): Effect.Effect<TopicReport, SemanticIndexError, FactStore> =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const facts = yield* store.query({});

    // Senders are attributed agents; exclude them from the topic ranking.
    const agentSlugs = new Set(facts.map((fact) => fact.attribution.agent).filter((slug): slug is string => !!slug));

    type Accumulator = { mentions: number; agents: Set<string>; sources: Set<string> };
    const byEntity = new Map<string, Accumulator>();

    for (const fact of facts) {
      const agent = fact.attribution.agent;
      for (const term of [fact.assertion.subject, fact.assertion.object]) {
        const entity = entityId(term);
        if (!entity || agentSlugs.has(entity)) {
          continue;
        }
        const accumulator = byEntity.get(entity) ?? { mentions: 0, agents: new Set(), sources: new Set() };
        accumulator.mentions += 1;
        if (agent) {
          accumulator.agents.add(agent);
        }
        accumulator.sources.add(fact.attribution.source);
        byEntity.set(entity, accumulator);
      }
    }

    const minMentions = options?.minMentions ?? 1;
    const limit = options?.limit ?? 20;
    const topics: Topic[] = [...byEntity.entries()]
      .filter(([, accumulator]) => accumulator.mentions >= minMentions)
      .map(([entity, accumulator]) => ({
        entity,
        label: humanize(entity),
        mentions: accumulator.mentions,
        agents: accumulator.agents.size,
        sources: [...accumulator.sources].slice(0, 5),
      }))
      .sort((left, right) => right.agents - left.agents || right.mentions - left.mentions)
      .slice(0, limit);

    return { topics, factCount: facts.length };
  });

/** A single extracted fact flattened for display. */
export type FactLine = {
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
  /** Attributed agent (resolved sender token), if any. */
  readonly agent?: string;
  /** Source DXN the fact was extracted from. */
  readonly source: string;
};

const termValue = (term: SemanticType.Term): string => ('entity' in term ? term.entity : term.literal);

/** List the stored facts (optionally filtered) as flat display lines — for inspection / demos. */
export const listFacts = (query: SemanticQuery = {}): Effect.Effect<FactLine[], SemanticIndexError, FactStore> =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const facts = yield* store.query(query);
    return facts.map((fact) => ({
      subject: termValue(fact.assertion.subject),
      predicate: fact.assertion.predicate,
      object: termValue(fact.assertion.object),
      ...(fact.attribution.agent ? { agent: fact.attribution.agent } : {}),
      source: fact.attribution.source,
    }));
  });
