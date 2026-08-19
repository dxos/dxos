//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  address: Schema.optional(
    Schema.String.annotate({
      title: 'Device address',
      description: 'IP address or hostname of the LaMetric on this network. Leave blank to push via the cloud.',
    }),
  ),
  appId: Schema.optional(
    Schema.String.annotate({
      title: 'App ID',
      description: 'Indicator app ID from developer.lametric.com.',
    }),
  ),
  widgetId: Schema.optional(Schema.String.annotate({ title: 'Widget ID' })),
  accessToken: Schema.optional(Schema.String.annotate({ title: 'Access token' })),
  minPushIntervalMs: Schema.optional(
    Schema.Number.annotate({
      title: 'Minimum push interval (ms)',
      description: 'The device is not built for rapid updates; changes inside this window are coalesced.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
