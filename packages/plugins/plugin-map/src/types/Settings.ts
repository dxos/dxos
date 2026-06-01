//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { APIKey, RecognizedDomainsAnnotation } from '@dxos/schema';

/** Domains for which the plugin can apply a user-supplied API key (e.g. MapTiler tiles). */
export const RECOGNIZED_API_KEY_DOMAINS = ['maptiler.com'] as const;

/**
 * Plugin settings for Maps.
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    apiKeys: Schema.optional(
      Schema.Array(APIKey).pipe(
        RecognizedDomainsAnnotation.set([...RECOGNIZED_API_KEY_DOMAINS]),
        Schema.annotations({
          title: 'API keys',
          description: 'API keys for third-party services such as map tile providers.',
        }),
      ),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
