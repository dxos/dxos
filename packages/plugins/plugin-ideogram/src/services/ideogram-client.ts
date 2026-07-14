//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';

import { proxyFetchLegacy } from '@dxos/edge-client';
import { GenerationService } from '@dxos/plugin-studio/types';

import { IDEOGRAM_GENERATE_URL, IDEOGRAM_SOURCE, IDEOGRAM_TIMEOUT_MS } from '../constants';
import { type IdeogramGenerateResponse, mapIdeogramResponse } from './ideogram-mapping';
import { decodeIdeogramConfig } from './ideogram-request';

/** Builds the Ideogram `/generate` request body (fields nested under `image_request`). */
const toRequestBody = (request: GenerationService.GenerationRequest) => {
  const config = decodeIdeogramConfig(request);
  return {
    image_request: {
      prompt: config.prompt ?? '',
      ...(config.aspectRatio ? { aspect_ratio: config.aspectRatio } : {}),
      ...(config.model ? { model: config.model } : {}),
      ...(config.negativePrompt ? { negative_prompt: config.negativePrompt } : {}),
      ...(config.styleType ? { style_type: config.styleType } : {}),
      ...(config.seed !== undefined ? { seed: config.seed } : {}),
      ...(request.count !== undefined ? { num_images: request.count } : {}),
    },
  };
};

/**
 * Calls the Ideogram `/generate` endpoint. The API key (resolved by the caller from the
 * Connector-managed credential) is sent in the `Api-Key` header. Note: the returned image URLs are
 * ephemeral and expire after a short period.
 */
export const generateWithIdeogram = async (
  request: GenerationService.GenerationRequest,
  apiKey?: Redacted.Redacted<string>,
): Promise<GenerationService.GenerationResult> => {
  if (!apiKey) {
    throw new GenerationService.MissingCredentialError(IDEOGRAM_SOURCE);
  }

  // Route through the DXOS edge CORS proxy — api.ideogram.ai does not permit browser CORS. The
  // `Api-Key` header passes through unchanged (the proxy only special-cases `Authorization`).
  // Bound the call so a hung request cannot block the caller indefinitely.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IDEOGRAM_TIMEOUT_MS);
  let response: Response;
  try {
    response = await proxyFetchLegacy(new URL(IDEOGRAM_GENERATE_URL), {
      method: 'POST',
      headers: {
        'Api-Key': Redacted.value(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toRequestBody(request)),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new GenerationService.GenerationError(`Ideogram request failed (${response.status}): ${detail}`);
  }

  // `Response.json()` is typed `any`; assign to the response type (no cast) and guard the shape so an
  // unexpected envelope fails loudly rather than mapping to silent garbage.
  const json: IdeogramGenerateResponse = await response.json();
  if (typeof json !== 'object' || json === null) {
    throw new GenerationService.GenerationError('Ideogram returned an unexpected response shape.');
  }
  return { variants: mapIdeogramResponse(json, decodeIdeogramConfig(request)) };
};
