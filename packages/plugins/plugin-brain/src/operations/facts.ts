//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { FactStore, RDF, type SemanticIndexError, type SemanticQuery, normalizeEntityId } from '@dxos/pipeline-rdf';

import { BrainOperation } from '#types';

/** Display form of a term: the preserved surface label, else the slug; literals render verbatim. */
export const formatTerm = (term: RDF.Term): string =>
  term.kind === 'entity' ? (term.label ?? term.entity) : term.literal;

/** Projects a stored fact onto the LLM-facing {@link BrainOperation.CompactFact} shape. */
export const toCompactFact = (fact: RDF.Fact): BrainOperation.CompactFact => ({
  id: fact.id,
  subject: formatTerm(fact.assertion.subject),
  predicate: fact.assertion.predicate,
  object: formatTerm(fact.assertion.object),
  factuality: fact.factuality.value,
  ...(fact.factuality.confidence !== undefined ? { confidence: fact.factuality.confidence } : {}),
  date: fact.recordedAt.slice(0, 10),
  source: fact.attribution.source,
});

/** One text line per fact for LLM prompts: `[id] subject — predicate — object (factuality, date)`. */
export const factLine = (fact: BrainOperation.CompactFact): string =>
  `[${fact.id}] ${fact.subject} — ${fact.predicate} — ${fact.object} (${fact.factuality}${
    fact.confidence !== undefined ? ` ${fact.confidence}` : ''
  }, ${fact.date})`;

/**
 * The entities labelled one of `labels` (compared lowercased) that have an IRI of their own — a Discord user, a
 * resolved ECHO object — leaving out IRIs local to one graph, which a slug already matches by suffix.
 */
const labelledEntitiesSparql = (labels: readonly string[]): string => `
  SELECT DISTINCT ?entity WHERE {
    GRAPH ?g { ?entity <${RDF.Vocab.RDFS_LABEL}> ?label }
    FILTER(
      isIRI(?entity) &&
      LCASE(STR(?label)) IN (${labels.map((label) => JSON.stringify(label)).join(', ')}) &&
      !STRSTARTS(STR(?entity), ${JSON.stringify(RDF.Vocab.GRAPH)}) &&
      !STRSTARTS(STR(?entity), ${JSON.stringify(RDF.Vocab.FACT)})
    )
  }`;

const ABSOLUTE_IRI = /^[a-z][a-z0-9+.-]*:[^\s]+$/i;

/**
 * The entity keys a name the model gives can mean: its slug (which also matches graph-local entities by suffix), and
 * every entity with an IRI of its own whose label is the name — a slug alone never finds `https://discord.com/users/…`.
 */
export const resolveEntityKeys = (name: string): Effect.Effect<string[], SemanticIndexError, FactStore> =>
  Effect.gen(function* () {
    // An absolute IRI of any scheme (`did:…`, `echo://…`) is its own key; normalizing would slug it. A space rules out
    // labels such as `Meeting: standup`, which also start with a word and a colon.
    const raw = name.trim();
    if (ABSOLUTE_IRI.test(raw)) {
      return [raw];
    }
    const key = normalizeEntityId(name);
    if (RDF.Vocab.isIri(key)) {
      return [key];
    }
    const store = yield* FactStore;
    const labels = [...new Set([name.trim(), key, key.replace(/-/g, ' ')].map((label) => label.toLowerCase()))];
    const rows = yield* store.rows(labelledEntitiesSparql(labels));
    const iris = rows.flatMap(({ entity }) => (entity?.termType === 'NamedNode' ? [entity.value] : []));
    return [...new Set([key, ...iris])];
  });

/** Every graph another graph supersedes or retracts, stated about the replacing graph in the default graph. */
const replacedGraphsSparql = `SELECT DISTINCT ?graph WHERE {
  { ?replacing <${RDF.Vocab.sx('supersedes').value}> ?graph } UNION { ?replacing <${RDF.Vocab.sx('retracts').value}> ?graph }
}`;

/**
 * Runs a structured query with its entity names resolved through {@link resolveEntityKeys}: one store query per
 * combination of the keys they resolve to, merged by fact id in first-seen order, without any graph another graph in
 * the store supersedes or retracts.
 */
export const queryResolvedFacts = (query: SemanticQuery): Effect.Effect<RDF.Fact[], SemanticIndexError, FactStore> =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const { entity, subjectEntity, ...rest } = query;
    const entities = entity === undefined ? [undefined] : yield* resolveEntityKeys(entity);
    const subjects = subjectEntity === undefined ? [undefined] : yield* resolveEntityKeys(subjectEntity);
    const byId = new Map<string, RDF.Fact>();
    for (const entityKey of entities) {
      for (const subjectKey of subjects) {
        const facts = yield* store.query({
          ...rest,
          ...(entityKey !== undefined ? { entity: entityKey } : {}),
          ...(subjectKey !== undefined ? { subjectEntity: subjectKey } : {}),
        });
        for (const fact of facts) {
          if (!byId.has(fact.id)) {
            byId.set(fact.id, fact);
          }
        }
      }
    }
    // The store keeps every version of a graph and only current ones answer. A replacement need not match the query
    // (Alice moving from Acme to Contoso answers a query for Acme with the old graph alone), so look up store-wide.
    const replaced = new Set(
      (yield* store.rows(replacedGraphsSparql)).flatMap(({ graph }) =>
        graph?.termType === 'NamedNode' ? [graph.value] : [],
      ),
    );
    return [...byId.values()].filter((fact) => !replaced.has(RDF.Mapping.graphOf(fact)));
  });
