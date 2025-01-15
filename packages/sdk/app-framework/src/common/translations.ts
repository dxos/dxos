//
// Copyright 2023 DXOS.org
//

import { z } from 'zod';

// TODO(burdon): Replace zod with effect.
export const ResourceKey = z.union([z.string(), z.record(z.any())]);
export type ResourceKey = z.infer<typeof ResourceKey>;

export const ResourceLanguage = z.record(ResourceKey);
export type ResourceLanguage = z.infer<typeof ResourceLanguage>;

/**
 * A resource is a collection of translations for a language.
 */
export const Resource = z.record(ResourceLanguage);
export type Resource = z.infer<typeof Resource>;
