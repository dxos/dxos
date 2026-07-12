//
// Copyright 2026 DXOS.org
//

import { type ImageGeneration } from '@dxos/plugin-image/types';

/** One `data[]` entry in an Ideogram `/generate` response. */
export type IdeogramImageData = {
  url?: string | null;
  prompt?: string;
  resolution?: string;
  seed?: number;
  is_image_safe?: boolean;
  style_type?: string;
};

/** Shape of the Ideogram `/generate` JSON response (subset). */
export type IdeogramGenerateResponse = {
  created?: string;
  request_id?: string;
  data?: IdeogramImageData[];
};

/**
 * Maps an Ideogram `/generate` response to provider-agnostic {@link ImageGeneration.GeneratedImageData}.
 * Entries without a `url` (e.g. safety-filtered) are dropped.
 */
export const mapIdeogramResponse = (
  response: IdeogramGenerateResponse,
  request?: ImageGeneration.ImageGenerationRequest,
): ImageGeneration.GeneratedImageData[] =>
  (response.data ?? [])
    .filter(
      (entry): entry is IdeogramImageData & { url: string } => typeof entry.url === 'string' && entry.url.length > 0,
    )
    .map((entry) => ({
      url: entry.url,
      prompt: entry.prompt,
      model: request?.model ?? 'V_2',
      resolution: entry.resolution,
      seed: entry.seed,
      styleType: entry.style_type,
      isImageSafe: entry.is_image_safe,
      metadata: { requestId: response.request_id, created: response.created },
    }));
