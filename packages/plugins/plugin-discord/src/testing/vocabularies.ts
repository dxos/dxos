//
// Copyright 2026 DXOS.org
//

import { type ExtractFactsOptions } from '@dxos/crawler';
import { RDF } from '@dxos/pipeline-rdf';

/**
 * Extraction options from the environment: `DISCORD_VOCABULARIES` names the published vocabularies to seed the ontology
 * with (`schema,foaf,dcterms,org,sioc` or `all`), and `DISCORD_CLOSED_ONTOLOGY=1` drops relations none of them fits.
 */
export const extractOptionsFromEnv = (env: NodeJS.ProcessEnv = process.env): ExtractFactsOptions => {
  const packs = env.DISCORD_VOCABULARIES ? RDF.Vocabularies.parse(env.DISCORD_VOCABULARIES) : [];
  return {
    ...(packs.length > 0 ? { ontology: RDF.Vocabularies.compose(packs) } : {}),
    ...(env.DISCORD_CLOSED_ONTOLOGY === '1' ? { closed: true } : {}),
  };
};
