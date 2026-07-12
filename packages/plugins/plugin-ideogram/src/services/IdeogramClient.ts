//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';

import { ImageGeneration } from '@dxos/plugin-illustrator/types';

import {
  IDEOGRAM_CONNECTOR_ID,
  IDEOGRAM_GENERATE_URL,
  IDEOGRAM_ID,
  IDEOGRAM_SOURCE,
  IDEOGRAM_TIMEOUT_MS,
} from '../constants';
import { type IdeogramGenerateResponse, mapIdeogramResponse } from './ideogram-mapping';

/** Builds the Ideogram `/generate` request body (fields nested under `image_request`). */
const toRequestBody = (request: ImageGeneration.ImageGenerationRequest) => ({
  image_request: {
    prompt: request.prompt,
    ...(request.aspectRatio ? { aspect_ratio: request.aspectRatio } : {}),
    ...(request.model ? { model: request.model } : {}),
    ...(request.negativePrompt ? { negative_prompt: request.negativePrompt } : {}),
    ...(request.styleType ? { style_type: request.styleType } : {}),
    ...(request.seed !== undefined ? { seed: request.seed } : {}),
    ...(request.count !== undefined ? { num_images: request.count } : {}),
  },
});

/**
 * Calls the Ideogram `/generate` endpoint. The API key (resolved by the caller from the
 * Connector-managed credential) is sent in the `Api-Key` header. Note: the returned image URLs are
 * ephemeral and expire after a short period.
 */
export const generateWithIdeogram = async (
  request: ImageGeneration.ImageGenerationRequest,
  apiKey?: Redacted.Redacted<string>,
): Promise<ImageGeneration.ImageGenerationResult> => {
  if (!apiKey) {
    throw new ImageGeneration.MissingCredentialError(IDEOGRAM_SOURCE);
  }

  // Bound the external call so a hung request cannot block the caller indefinitely.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IDEOGRAM_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(IDEOGRAM_GENERATE_URL, {
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
    throw new ImageGeneration.GenerationError(`Ideogram request failed (${response.status}): ${detail}`);
  }

  // `Response.json()` is typed `any`; assign to the response type (no cast) and guard the shape so an
  // unexpected envelope fails loudly rather than mapping to silent garbage.
  const json: IdeogramGenerateResponse = await response.json();
  if (typeof json !== 'object' || json === null) {
    throw new ImageGeneration.GenerationError('Ideogram returned an unexpected response shape.');
  }
  return { images: mapIdeogramResponse(json, request) };
};

/** The Ideogram {@link ImageGeneration.ImageGenerationService}. */
export const makeIdeogramImageGenerationService = (): ImageGeneration.ImageGenerationService => ({
  id: IDEOGRAM_ID,
  label: 'Ideogram',
  source: IDEOGRAM_SOURCE,
  connectorId: IDEOGRAM_CONNECTOR_ID,
  generate: (request, { apiKey }) => generateWithIdeogram(request, apiKey),
});
