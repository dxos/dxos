//
// Copyright 2026 DXOS.org
//

import { type ExtractFactsOptions } from '@dxos/crawler';
import { Vocabularies } from '@dxos/echo-memory';
import { type RunOptions } from '@dxos/pipeline-discord';

/**
 * Extraction options from the environment. Extraction seeds its ontology with every published vocabulary by default;
 * `DISCORD_VOCABULARIES` narrows that (`schema,foaf,dcterms,org,sioc`, `all`, or `none` for the bare seed), and
 * `DISCORD_CLOSED_ONTOLOGY=1` drops relations no listed predicate fits, and `DISCORD_THINKING=0` extracts without thinking.
 * `DISCORD_EXTRACT_CONCURRENCY` sets how many extraction batches run at once (default 4).
 */
export const extractOptionsFromEnv = (env: NodeJS.ProcessEnv = process.env): ExtractFactsOptions => ({
  // Composed even when it names no pack, so `none` means the seed rather than falling back to the default.
  ...(env.DISCORD_VOCABULARIES ? { ontology: Vocabularies.compose(Vocabularies.parse(env.DISCORD_VOCABULARIES)) } : {}),
  ...(env.DISCORD_CLOSED_ONTOLOGY === '1' ? { closed: true } : {}),
  ...(env.DISCORD_THINKING === '0' ? { thinking: false } : {}),
  concurrency: Number(env.DISCORD_EXTRACT_CONCURRENCY ?? 4),
});

/**
 * Pipeline options from the environment: {@link extractOptionsFromEnv}, and `DISCORD_TOPICS_CONCURRENCY` channels
 * summarized at once (default 8). A serial run spends nearly all its time waiting on one model call after another.
 */
export const runOptionsFromEnv = (env: NodeJS.ProcessEnv = process.env): RunOptions => ({
  extract: extractOptionsFromEnv(env),
  topicsConcurrency: Number(env.DISCORD_TOPICS_CONCURRENCY ?? 8),
});
