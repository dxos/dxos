//
// Copyright 2026 DXOS.org
//

import { type GenerationService } from '@dxos/plugin-studio/types';

import { type IdeogramRequestConfig } from './ideogram-request';

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
 * Maps an Ideogram `/generate` response to provider-agnostic {@link GenerationService.VariantData}.
 * Each variant carries `image/png` content and a `Generation` recording the model/seed/provider
 * knobs (resolution, style, safety) under `parameters`. Entries without a `url` (e.g. safety-filtered)
 * are dropped — provider URLs are ephemeral.
 */
export const mapIdeogramResponse = (
  response: IdeogramGenerateResponse,
  config?: IdeogramRequestConfig,
): GenerationService.VariantData[] =>
  (response.data ?? [])
    .filter(
      (entry): entry is IdeogramImageData & { url: string } => typeof entry.url === 'string' && entry.url.length > 0,
    )
    .map((entry) => ({
      contentType: 'image/png',
      url: entry.url,
      generation: {
        provider: 'ideogram',
        model: config?.model ?? 'V_2',
        prompt: entry.prompt,
        seed: entry.seed,
        requestId: response.request_id,
        createdAt: response.created,
        parameters: {
          resolution: entry.resolution,
          styleType: entry.style_type,
          isImageSafe: entry.is_image_safe,
        },
      },
    }));
