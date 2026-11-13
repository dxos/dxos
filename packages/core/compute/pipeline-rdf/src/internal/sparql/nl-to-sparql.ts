//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { Parser } from 'sparqljs';

import { AiService } from '@dxos/ai';
import { trim } from '@dxos/util';

import { SemanticIndexError } from '../../errors.ts';
import { type EntityKind } from '../../types/Entity.ts';
import * as Graph from '../../types/Graph.ts';
import * as Mapping from '../../types/Mapping.ts';
import * as Ontology from '../../types/Ontology.ts';
import * as Vocab from '../../types/Vocab.ts';
import { DEFAULT_MODEL } from '../stages/extract.ts';

const SparqlShape = Schema.Struct({ sparql: Schema.String });

const KINDS: readonly EntityKind[] = ['person', 'org', 'place', 'event', 'concept', 'thing'];

/** Predicates listed in the prompt; a pool past this is cut to keep the prompt bounded. */
const MAX_PREDICATES = 300;

const prefixLines = (): string =>
  Object.entries(Graph.PREFIXES)
    .map(([prefix, iri]) => `PREFIX ${prefix}: <${iri}>`)
    .join('\n');

const predicateLines = (predicates: readonly Ontology.Entry[]): string =>
  predicates
    .filter((entry) => entry.replacedBy === undefined)
    .slice(0, MAX_PREDICATES)
    .map((entry) =>
      [
        `- <${entry.iri}> "${entry.label}"`,
        entry.synonyms?.length ? ` (also: ${entry.synonyms.join(', ')})` : '',
        entry.description ? ` — ${entry.description}` : '',
      ].join(''),
    )
    .join('\n');

/** The prompt that asks for one SPARQL SELECT over the store's storage model; exported for tests. */
export const sparqlPrompt = (question: string, predicates: readonly Ontology.Entry[]): string => trim`
  Translate a natural-language question into ONE SPARQL 1.1 SELECT query over a fact store.

  Storage model:
  - Every statement is one triple inside its own named graph: GRAPH ?g { ?subject <predicate> ?object }.
    The graph IRI identifies the statement; bind it as ?g whenever the answer is a set of statements (facts),
    so the caller can show them.
  - Inside the same graph, each entity the statement mentions has its label and kind:
    ?entity rdfs:label "Alice Chen" . ?entity a <class> .
    Kind classes: ${KINDS.map((kind) => `${kind} = <${Mapping.classIri(kind)}>`).join(', ')}.
  - Entity IRIs are usually local to the graph that mentions them, so the same entity has a different IRI in each
    graph: match entities by label (e.g. FILTER(CONTAINS(LCASE(STR(?label)), "alice"))), never by a guessed IRI,
    and use DISTINCT on labels when listing entities.
  - Each statement's provenance is stated about its graph in the DEFAULT graph (outside any GRAPH block):
    ?g a sx:Graph ; sx:factuality "CT+" ; sx:polarity "+" ; sx:confidence "0.9" (a string; compare with
    xsd:decimal(?c)) ; sx:quote "…" ; prov:wasDerivedFrom "<source dxn or url>" ; prov:generatedAtTime "<iso>" ;
    sx:recordedAt "<iso>" ; prov:wasAttributedTo ?speaker ; sx:agentLabel "<speaker name>" .
  - The graph <${Vocab.ONTOLOGY_GRAPH}> describes predicates, not statements; add ?g a sx:Graph to keep it out of an
    unconstrained GRAPH ?g pattern.

  Prefixes (declare the ones you use):
  ${prefixLines()}

  Predicates the store knows (IRI, label, synonyms, meaning):
  ${predicateLines(predicates)}

  Rules:
  - Emit only a SELECT (no updates, no CONSTRUCT/ASK/DESCRIBE), with every prefix it uses declared.
  - Prefer a predicate from the list; when unsure which, leave the predicate a variable and filter by entity labels.
  - Keep it small: DISTINCT, and a LIMIT of at most 500 unless the question asks for a count.

  Examples:
  - "show all people" ->
    PREFIX rdfs: <${Vocab.RDFS}>
    SELECT DISTINCT ?person ?label WHERE { GRAPH ?g { ?person a <${Mapping.classIri('person')}> . OPTIONAL { ?person rdfs:label ?label } } }
  - "what does Alice work on?" ->
    PREFIX rdfs: <${Vocab.RDFS}>
    SELECT DISTINCT ?g ?p ?object WHERE {
      GRAPH ?g { ?alice ?p ?object . ?alice rdfs:label ?name FILTER(CONTAINS(LCASE(STR(?name)), "alice")) }
    } LIMIT 500

  Question: ${question}
`;

/** Fails unless `sparql` parses as a SPARQL SELECT. */
const parseSelect = (sparql: string): Effect.Effect<string, SemanticIndexError> =>
  Effect.try({
    try: () => {
      const parsed = new Parser().parse(sparql);
      if (parsed.type !== 'query' || parsed.queryType !== 'SELECT') {
        throw new TypeError(`expected a SELECT, got ${parsed.type === 'query' ? parsed.queryType : 'an update'}`);
      }
      return sparql;
    },
    catch: (cause) =>
      new SemanticIndexError({
        message: `Generated SPARQL is not a valid SELECT: ${cause instanceof Error ? cause.message : String(cause)}`,
        cause,
      }),
  });

const ask = (prompt: string) =>
  LanguageModel.generateObject({ schema: SparqlShape, prompt }).pipe(Effect.map(({ value }) => value.sparql.trim()));

/**
 * Translate a natural-language question into a SPARQL SELECT over the store's storage model, grounded in the
 * predicates the store knows (its `predicates()`). Output that does not parse is sent back once with the parser's
 * error; pair the result with {@link FactStoreApi.rows} (or `select`, when it binds `?g`).
 */
export const generateSparql = (
  question: string,
  predicates: readonly Ontology.Entry[] = Ontology.DEFAULT.entries,
): Effect.Effect<string, SemanticIndexError, AiService.AiService> =>
  Effect.gen(function* () {
    const prompt = sparqlPrompt(question, predicates);
    const first = yield* ask(prompt);
    return yield* parseSelect(first).pipe(
      Effect.catch((error) =>
        ask(`${prompt}\n\nYour previous answer was rejected (${error.message}):\n${first}\n\nAnswer again.`).pipe(
          Effect.flatMap(parseSelect),
        ),
      ),
    );
  }).pipe(
    Effect.provide(AiService.languageModel(DEFAULT_MODEL).pipe(Layer.orDie)),
    Effect.mapError((cause) =>
      cause instanceof SemanticIndexError
        ? cause
        : new SemanticIndexError({ message: 'Failed to generate SPARQL', cause }),
    ),
  );
