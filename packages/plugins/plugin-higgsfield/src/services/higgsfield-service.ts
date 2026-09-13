//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';

import { proxyFetchLegacy } from '@dxos/edge-client';
import type * as GenerationService from '@dxos/plugin-studio/GenerationService';

import {
  HIGGSFIELD_CONNECTOR_ID,
  HIGGSFIELD_DEFAULT_IMAGE_MODEL,
  HIGGSFIELD_ID,
  HIGGSFIELD_SOURCE,
} from '../constants.ts';
import { type HiggsfieldOutput, type HiggsfieldRequestStatus } from './higgsfield-provider-types.ts';
import { HiggsfieldProvider } from './higgsfield-provider.ts';
import { HiggsfieldRequestConfig, decodeHiggsfieldConfig } from './higgsfield-request.ts';

// api.higgsfield.ai is server-side only (no browser CORS), so route through the DXOS edge CORS proxy;
// it remaps `Authorization` to `X-Cors-Proxy-Authorization` and restores it on the way out.
const proxyFetch: typeof globalThis.fetch = (input, init) =>
  proxyFetchLegacy(new URL(typeof input === 'string' ? input : input.toString()), init);

const credentialString = (apiKey?: Redacted.Redacted<string>): string => (apiKey ? Redacted.value(apiKey) : '');

const STATUS_LABELS: Record<HiggsfieldRequestStatus, string> = {
  queued: 'Queued',
  in_progress: 'Generating',
  completed: 'Completed',
  failed: 'Failed',
  nsfw: 'Rejected',
  canceled: 'Canceled',
};

/** A Higgsfield provider wired to the edge CORS proxy (shared by the image and video services). */
export const makeHiggsfieldProvider = (): HiggsfieldProvider => new HiggsfieldProvider({ fetch: proxyFetch });

/** Maps a completed request's outputs to variants; the mime follows the media actually produced. */
export const toVariants = (output: HiggsfieldOutput): GenerationService.VariantData[] => {
  const generation = { provider: HIGGSFIELD_ID };
  switch (output.kind) {
    case 'image':
      return output.urls.map((url) => ({ contentType: 'image/jpeg', url, generation }));
    case 'video':
      return [{ contentType: 'video/mp4', url: output.url, generation }];
    case 'audio':
      return output.urls.map((url) => ({ contentType: 'audio/mpeg', url, generation }));
  }
};

type ServiceParams = {
  kind: 'image' | 'video';
  label: string;
  contentType: string;
  defaultRequest?: Record<string, unknown>;
};

/**
 * Builds one asynchronous {@link GenerationService.GenerationService} over the shared provider:
 * `enqueue` posts the prompt to the configured model path (persisted by the studio generate op as
 * the job id), `awaitResult` polls to completion and maps the produced URLs to variants.
 */
const makeService = (
  provider: HiggsfieldProvider,
  { kind, label, contentType, defaultRequest }: ServiceParams,
): GenerationService.GenerationService => ({
  kind,
  id: HIGGSFIELD_ID,
  label,
  contentType,
  source: HIGGSFIELD_SOURCE,
  connectorId: HIGGSFIELD_CONNECTOR_ID,
  requestSchema: HiggsfieldRequestConfig,
  defaultRequest,
  // Async so a config decode failure surfaces as a rejection, not a synchronous throw.
  enqueue: async (request, { apiKey, signal }) => {
    const config = decodeHiggsfieldConfig(request);
    return provider.enqueue(
      { model: config.model, body: { prompt: config.prompt } },
      { credential: credentialString(apiKey), signal },
    );
  },
  awaitResult: async (jobId, { apiKey, signal, onProgress }) => {
    const output = await provider.awaitResult(jobId, {
      credential: credentialString(apiKey),
      signal,
      onStatus: (status) => onProgress?.({ status: STATUS_LABELS[status] }),
    });
    return { variants: toVariants(output) };
  },
});

/** The Higgsfield `kind: 'image'` service; defaults to the documented Soul v2 text-to-image model. */
export const makeHiggsfieldImageService = (
  provider: HiggsfieldProvider = makeHiggsfieldProvider(),
): GenerationService.GenerationService =>
  makeService(provider, {
    kind: 'image',
    label: 'Higgsfield',
    contentType: 'image/jpeg',
    defaultRequest: { model: HIGGSFIELD_DEFAULT_IMAGE_MODEL },
  });

/**
 * The Higgsfield `kind: 'video'` service. Video model paths are account-specific and absent from the
 * public docs, so there is no default — the user enters the path in the form.
 */
export const makeHiggsfieldVideoService = (
  provider: HiggsfieldProvider = makeHiggsfieldProvider(),
): GenerationService.GenerationService =>
  makeService(provider, { kind: 'video', label: 'Higgsfield', contentType: 'video/mp4' });
