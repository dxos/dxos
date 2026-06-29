//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';

import { SemanticIndexError } from './errors';
import { DEFAULT_MODEL } from './internal/stages/extract';
import { ENTITY, PROV, SX } from './internal/vocab';

const QueryResult = Schema.Struct({ sparql: Schema.String });

// The store reassembles facts from `?fact ?p ?o` bindings, so the query MUST project those three
// variables and bind ?fact to the matching fact nodes; the ontology below is what the facts reify to.
const PROMPT = `You translate a natural-language question into a single SPARQL SELECT over a fact graph.

Ontology (prefixes):
  PREFIX sx: <${SX}>
  PREFIX prov: <${PROV}>
Each fact is a node ?fact with these triples:
  ?fact sx:subject     <entity-or-literal>   # subject term
  ?fact sx:predicate   "verb phrase"          # literal
  ?fact sx:object      <entity-or-literal>   # object term
  ?fact sx:factuality  "CT+|PR+|PS+|..."      # literal
  ?fact sx:polarity    "+|-|?"                # literal
  ?fact prov:wasDerivedFrom   "source"        # literal
  ?fact prov:wasAttributedTo  <entity>        # agent entity (optional)
  ?fact prov:generatedAtTime  "ISO date"      # literal (optional)
Entities are IRIs of the form <${ENTITY}{slug}> where slug = the label lowercased with every run of
non-alphanumeric characters replaced by '-'. Example: "Sarah Johnson" -> <${ENTITY}sarah-johnson>.

Rules:
- Output exactly one SPARQL SELECT.
- It MUST be of the shape: SELECT ?fact ?p ?o WHERE { <constraints that bind ?fact> ?fact ?p ?o }
  (the trailing "?fact ?p ?o" returns every annotation of each matching fact for reassembly).
- Prefer matching entities by IRI when the question names a specific person/org; otherwise constrain
  on sx:predicate or use FILTER(CONTAINS(...)) over literals/IRIs for fuzzier matches.
- If the question is broad ("everything", "all facts"), constrain minimally (e.g. just ?fact ?p ?o).

Example — "What did Sarah Johnson do?":
  SELECT ?fact ?p ?o WHERE { ?fact sx:subject <${ENTITY}sarah-johnson> . ?fact ?p ?o }`;

/**
 * Generate a SPARQL `SELECT ?fact ?p ?o` from a natural-language question, grounded in the fact
 * reification ontology. Pair with {@link SemanticStoreApi.select} to execute and reassemble Facts.
 */
export const generateSparql = (question: string): Effect.Effect<string, SemanticIndexError, AiService.AiService> =>
  Effect.gen(function* () {
    const response = yield* LanguageModel.generateObject({
      schema: QueryResult,
      prompt: `${PROMPT}\n\nQuestion: ${question}`,
    });
    return response.value.sparql;
  }).pipe(
    Effect.provide(AiService.model(DEFAULT_MODEL).pipe(Layer.orDie)),
    Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to generate SPARQL', cause })),
  );
