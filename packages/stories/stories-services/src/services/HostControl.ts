//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Service from './Service.ts';

/** Where a host runs, which decides how far it is from a consumer and what it can be trusted with. */
export const Kind = Schema.Literals(['app', 'worker', 'frame', 'edge']);
export type Kind = Schema.Schema.Type<typeof Kind>;

/** One contract a host's plugins provide, and whether the host can run it. */
export const ServiceRecord = Schema.Struct({
  key: Schema.String,
  version: Schema.String,
  /** False while the host lacks a feature the provider needs; `unmet` names them. */
  active: Schema.Boolean,
  /** Names the provider's current activation, and is empty while it is inactive. */
  instance: Schema.String,
  unmet: Schema.Array(Schema.String),
});
export type ServiceRecord = Schema.Schema.Type<typeof ServiceRecord>;

/** A host's catalog: what it is, what it has and what it provides. */
export const Description = Schema.Struct({
  id: Schema.String,
  kind: Kind,
  features: Schema.Array(Schema.String),
  plugins: Schema.Array(Schema.String),
  services: Schema.Array(ServiceRecord),
});
export type Description = Schema.Schema.Type<typeof Description>;

/** Whether a host reached one thing it tried: `skipped` where the attempt would prove nothing. */
export const Check = Schema.Struct({
  outcome: Schema.Literals(['blocked', 'reachable', 'skipped']),
  /** Why, in words a reader of the story can act on. */
  detail: Schema.String,
});
export type Check = Schema.Schema.Type<typeof Check>;

/** What a host could reach of its parent's when it tried, one check for each thing. */
export const Probe = Schema.Struct({
  localStorage: Check,
  indexedDb: Check,
  fetch: Check,
  /** A request `fetch` does not cover, since a policy governs images separately. */
  image: Check,
  /** Whether the host could resolve a contract of its parent that it was not granted. */
  ungranted: Check,
});
export type Probe = Schema.Schema.Type<typeof Probe>;

/** The result of a host that was given no probe. */
export const NOT_PROBED: Probe = {
  localStorage: { outcome: 'skipped', detail: 'not probed' },
  indexedDb: { outcome: 'skipped', detail: 'not probed' },
  fetch: { outcome: 'skipped', detail: 'not probed' },
  image: { outcome: 'skipped', detail: 'not probed' },
  ungranted: { outcome: 'skipped', detail: 'not probed' },
};

/**
 * The contract every host provides about itself. Installing a plugin is a service call like any
 * other, so a consumer installs into the app, a worker or EDGE through one interface.
 */
export const Contract = Service.make('org.dxos.stories.services.host', {
  version: '0.1.0',
  methods: {
    install: { payload: Schema.Struct({ plugin: Schema.String }), success: Schema.Void },
    uninstall: { payload: Schema.Struct({ plugin: Schema.String }), success: Schema.Void },
    probe: { payload: Schema.Struct({ ungranted: Schema.String }), success: Probe },
  },
  properties: {
    description: Description,
  },
  events: {},
});

export type Client = Service.Client<(typeof Contract)['shape']>;
