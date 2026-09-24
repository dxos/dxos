//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * A direct endpoint receives the connected key as a bearer token, so it must be HTTPS; plain HTTP is
 * allowed only on loopback, for a local proxy or dev server.
 */
export const isAllowedEndpoint = (value: string): boolean => {
  if (!URL.canParse(value)) {
    return false;
  }
  const url = new URL(value);
  return url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname));
};

/** Who answers through EDGE: TypeSafe's own API, or Workers AI's `typesafe/jev` on EDGE's Cloudflare account. */
export const Backend = Schema.Literals(['typesafe', 'workers-ai']);

export type Backend = Schema.Schema.Type<typeof Backend>;

export const Settings = Schema.Struct({
  backend: Schema.optional(
    Backend.annotate({
      title: 'Backend',
      description:
        'Serve decisions from TypeSafe (default) or Cloudflare Workers AI; the endpoint override is ignored for Workers AI.',
    }),
  ),
  /**
   * Calls System One directly at this URL instead of through EDGE — for a self-hosted or regional
   * endpoint that sends CORS headers. Unset routes through EDGE, which works with no key connected.
   */
  endpoint: Schema.optional(
    Schema.String.check(
      Schema.makeFilter(
        (value) =>
          value.trim().length === 0 ||
          isAllowedEndpoint(value.trim()) ||
          'Must be an https URL (http only for localhost).',
      ),
    ).annotate({
      title: 'API endpoint',
      description: 'System One endpoint override.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

export const defaults = (): Settings => ({});
