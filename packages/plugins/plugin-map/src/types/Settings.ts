//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { APIKey, RecognizedDomainsAnnotation } from '@dxos/schema';

/** Domains for which the plugin can apply a user-supplied API key (e.g. MapTiler tiles). */
export const RECOGNIZED_API_KEY_DOMAINS = ['maptiler.com'] as const;

/**
 * Plugin settings for Maps.
 */
export const Settings = Schema.Struct({
  apiKeys: Schema.optional(
    Schema.Array(APIKey).pipe(
      RecognizedDomainsAnnotation.set([...RECOGNIZED_API_KEY_DOMAINS]),
      Schema.annotate({
        title: 'API keys',
        description: 'API keys for third-party services such as map tile providers.',
      }),
    ),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
