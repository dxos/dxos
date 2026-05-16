//
// Copyright 2026 DXOS.org
//

import { Generation } from '#types';

import { GeminiProvider, type GeminiProviderOptions } from './GeminiProvider';
import { type GenerationProvider } from './GenerationProvider';
import { HeyGenProvider, type HeyGenProviderOptions } from './HeyGenProvider';

export type CreateProviderOptions = {
  heygen?: HeyGenProviderOptions;
  gemini?: GeminiProviderOptions;
};

/**
 * Factory for `GenerationProvider` instances keyed by `Generation.ProviderId`.
 * Centralising construction here keeps consumers (the article + properties
 * surfaces) ignorant of which concrete adapter they're talking to — they only
 * see the generic interface.
 */
export const createProvider = (id: Generation.ProviderId, options: CreateProviderOptions = {}): GenerationProvider => {
  switch (id) {
    case 'heygen':
      return new HeyGenProvider(options.heygen);
    case 'gemini':
      return new GeminiProvider(options.gemini);
  }
};
