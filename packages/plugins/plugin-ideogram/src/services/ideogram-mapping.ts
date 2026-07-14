//
// Copyright 2026 DXOS.org
//

import { type GenerationService } from '@dxos/plugin-studio/types';

import { type IdeogramRequestConfig } from './ideogram-request';

// The Ideogram API returns JSON `null` (not absent) for fields it has no value for — e.g.
// `request_id: null`. The Generation schema's optional fields are `T | undefined` (not nullable), so
// every field mapped onto a Variant must be coerced `null → undefined` (see the mapper below).

/** One `data[]` entry in an Ideogram `/generate` response. */
export type IdeogramImageData = {
  url?: string | null;
  prompt?: string | null;
  resolution?: string | null;
  seed?: number | null;
  is_image_safe?: boolean | null;
  style_type?: string | null;
};

/** Shape of the Ideogram `/generate` JSON response (subset). */
export type IdeogramGenerateResponse = {
  created?: string | null;
  request_id?: string | null;
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
        // Coerce null → undefined: the Generation schema's optional fields are not nullable.
        prompt: entry.prompt ?? undefined,
        seed: entry.seed ?? undefined,
        requestId: response.request_id ?? undefined,
        createdAt: response.created ?? undefined,
        parameters: {
          resolution: entry.resolution ?? undefined,
          styleType: entry.style_type ?? undefined,
          isImageSafe: entry.is_image_safe ?? undefined,
        },
      },
    }));
