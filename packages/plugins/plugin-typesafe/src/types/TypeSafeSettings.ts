//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Model } from '@dxos/ai';
import { type DXN } from '@dxos/keys';

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

/** Every decision model the space can serve, offered by its label. */
export const DecisionModel: Schema.Union<readonly Schema.Literal<DXN.DXN>[]> = Schema.Union(
  Model.decisionModels.map((model) => Schema.Literal(model.id).annotate({ title: model.label })),
);
export type DecisionModel = Schema.Schema.Type<typeof DecisionModel>;

export const Settings = Schema.Struct({
  /**
   * What `Model.defaultDecisionModel` resolves to — the model behind every decision whose caller did
   * not pin one. Unset means jev on TypeSafe's own API.
   */
  decisionModel: Schema.optional(
    DecisionModel.annotate({
      title: 'Default decision model',
      description: 'The model that answers decisions when the caller does not name one.',
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
