//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/** LaMetric's cloud push host; the LAN device serves the identical path with the same header. */
export const CLOUD_BASE_URL = 'https://developer.lametric.com';

/** The device API over TLS, behind a self-signed certificate. */
export const LOCAL_HTTPS_PORT = 4343;
export const LOCAL_HTTP_PORT = 8080;

/** The device cycles frames at a fixed rate, so a long list delays every number in it. */
export const MAX_FRAMES = 4;

/** A determinate progress bar the device draws itself. */
export const GoalData = Schema.Struct({
  start: Schema.Number,
  current: Schema.Number,
  end: Schema.Number,
  unit: Schema.String,
});
export type GoalData = Schema.Schema.Type<typeof GoalData>;

/** Text scrolls when it does not fit, which beats an ellipsis on a 37-pixel line. */
export const TextFrame = Schema.Struct({ text: Schema.String });
export type TextFrame = Schema.Schema.Type<typeof TextFrame>;

export const GoalFrame = Schema.Struct({ goalData: GoalData });
export type GoalFrame = Schema.Schema.Type<typeof GoalFrame>;

export const Frame = Schema.Union([TextFrame, GoalFrame]);
export type Frame = Schema.Schema.Type<typeof Frame>;

/** The whole body of a widget update; the device replaces its cycle with these frames. */
export const Payload = Schema.Struct({ frames: Schema.Array(Frame) });
export type Payload = Schema.Schema.Type<typeof Payload>;

export const widgetPath = (appId: string, widgetId: string): string => `/api/v1/dev/widget/update/${appId}/${widgetId}`;
