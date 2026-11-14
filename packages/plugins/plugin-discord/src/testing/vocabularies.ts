//
// Copyright 2026 DXOS.org
//

import { type ExtractFactsOptions } from '@dxos/crawler';
import { RDF } from '@dxos/pipeline-rdf';

/**
 * Extraction options from the environment. Extraction seeds its ontology with every published vocabulary by default;
 * `DISCORD_VOCABULARIES` narrows that (`schema,foaf,dcterms,org,sioc`, `all`, or `none` for the bare seed), and
 * `DISCORD_CLOSED_ONTOLOGY=1` drops relations no listed predicate fits.
 */
export const extractOptionsFromEnv = (env: NodeJS.ProcessEnv = process.env): ExtractFactsOptions => ({
  // Composed even when it names no pack, so `none` means the seed rather than falling back to the default.
  ...(env.DISCORD_VOCABULARIES
    ? { ontology: RDF.Vocabularies.compose(RDF.Vocabularies.parse(env.DISCORD_VOCABULARIES)) }
    : {}),
  ...(env.DISCORD_CLOSED_ONTOLOGY === '1' ? { closed: true } : {}),
});
