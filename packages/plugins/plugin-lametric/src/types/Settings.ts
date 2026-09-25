//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Format } from '@dxos/echo';

export const Settings = Schema.Struct({
  address: Schema.optional(
    Schema.String.annotate({
      title: 'Device address',
      description: 'IP address or hostname of the LaMetric on this network.',
    }),
  ),
  apiKey: Schema.optional(
    // Rendered masked: this is a credential typed into a settings form.
    Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotate({
      title: 'Device API key',
      description: 'From the Devices section of your LaMetric developer account.',
    }),
  ),
  widgetId: Schema.optional(
    Schema.String.annotate({
      title: 'Widget ID',
      description: 'Found on the device automatically; only set this to override what was discovered.',
    }),
  ),
  appId: Schema.optional(
    Schema.String.annotate({
      title: 'App ID',
      description: 'Cloud push only: a published indicator app from developer.lametric.com.',
    }),
  ),
  accessToken: Schema.optional(Schema.String.annotate({ title: 'Access token', description: 'Cloud push only.' })),
  minPushIntervalMs: Schema.optional(
    Schema.Number.annotate({
      title: 'Minimum push interval (ms)',
      description: 'The device is not built for rapid updates; changes inside this window are coalesced.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
