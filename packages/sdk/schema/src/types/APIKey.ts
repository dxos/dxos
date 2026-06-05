//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * A named API key scoped to a service domain, used by plugin settings to hold
 * third-party credentials (e.g. a MapTiler key for `maptiler.com`).
 *
 * TODO(burdon): Ensure this type is clearly distinct from `AccessToken` (which stores OAuth/session
 * credentials). `APIKey` is a static service key (e.g. a tile-provider key); `AccessToken` is a
 * user-credential token that may expire or be refreshed.
 */
export const APIKey = Schema.Struct({
  name: Schema.String.annotations({ title: 'Name' }),
  domain: Schema.String.annotations({ title: 'Domain' }),
  apiKey: Schema.String.annotations({ title: 'API key' }),
}).annotations({ title: 'API key' });

export interface APIKey extends Schema.Schema.Type<typeof APIKey> {}
