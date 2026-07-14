//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';

import { proxyFetchLegacy } from '@dxos/edge-client';
import { type GenerationService } from '@dxos/plugin-studio/types';

import { HEYGEN_CONNECTOR_ID, HEYGEN_ID, HEYGEN_SOURCE } from '../constants';
import { HeyGenProvider } from './heygen-provider';
import { HeyGenRequestConfig, decodeHeyGenConfig } from './heygen-request';

// api.heygen.com does not permit browser CORS, so route through the DXOS edge CORS proxy; the
// `X-Api-Key` header passes through unchanged (the proxy only special-cases `Authorization`).
const proxyFetch: typeof globalThis.fetch = (input, init) =>
  proxyFetchLegacy(new URL(typeof input === 'string' ? input : input.toString()), init);

const apiKeyString = (apiKey?: Redacted.Redacted<string>): string => (apiKey ? Redacted.value(apiKey) : '');

/** A HeyGen provider wired to the edge CORS proxy (shared by the generation service and the picker UI). */
export const makeHeyGenProvider = (): HeyGenProvider => new HeyGenProvider({ fetch: proxyFetch });

/**
 * The HeyGen `kind: 'video'` {@link GenerationService.GenerationService}. Asynchronous: `enqueue`
 * submits the job (persisted by the studio generate op), `awaitResult` polls to completion and maps
 * the produced URL to a single `video/mp4` variant.
 */
export const makeHeyGenGenerationService = (): GenerationService.GenerationService => {
  const provider = makeHeyGenProvider();
  return {
    kind: 'video',
    id: HEYGEN_ID,
    label: 'HeyGen',
    contentType: 'video/mp4',
    source: HEYGEN_SOURCE,
    connectorId: HEYGEN_CONNECTOR_ID,
    requestSchema: HeyGenRequestConfig,
    enqueue: (request, { apiKey, signal }) => {
      const config = decodeHeyGenConfig(request);
      return provider.enqueue(
        { type: 'video', prompt: config.prompt ?? '', avatarId: config.avatarId, voiceId: config.voiceId },
        { apiKey: apiKeyString(apiKey), signal },
      );
    },
    awaitResult: async (jobId, { apiKey, signal }) => {
      const { url } = await provider.awaitResult(jobId, { apiKey: apiKeyString(apiKey), signal });
      return { variants: [{ contentType: 'video/mp4', url, generation: { provider: HEYGEN_ID } }] };
    },
  };
};
