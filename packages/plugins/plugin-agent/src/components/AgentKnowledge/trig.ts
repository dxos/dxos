//
// Copyright 2026 DXOS.org
//

import { RDF } from '@dxos/pipeline-rdf';

/** The vocabularies stored facts use, as TriG prefixes. */
export const TRIG_PREFIXES = Object.entries(RDF.Graph.PREFIXES)
  .map(([prefix, iri]) => `@prefix ${prefix}: <${iri}>.`)
  .join('\n');

/**
 * The fact as the brain stores it, in TriG without the prefixes: its statement inside its named graph, then the
 * graph's provenance (pipeline-rdf's `factToTriples`).
 */
export const formatRawFact = (fact: RDF.Fact): string =>
  RDF.Graph.toTriG([fact])
    .split('\n')
    .filter((line) => !line.startsWith('@prefix'))
    .join('\n')
    .trim();
