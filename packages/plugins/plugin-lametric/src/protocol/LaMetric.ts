//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/** LaMetric's cloud push host, for a published cloud indicator app. */
export const CLOUD_BASE_URL = 'https://developer.lametric.com';

/**
 * The stock "My Data (DIY)" app, which is what local push goes through — LaMetric does not allow a
 * custom indicator app to be pushed to locally. The package is fixed; only the widget instance
 * varies, and its UUID exists solely in the device's own app list.
 */
export const DIY_PACKAGE = 'com.lametric.diy.devwidget';

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

/**
 * Position in the cycle. Without it the device shows only the first frame — verified on hardware,
 * where three unindexed frames rendered as one.
 */
const index = Schema.optional(Schema.Number);

/** Text scrolls when it does not fit, which beats an ellipsis on a 37-pixel line. */
export const TextFrame = Schema.Struct({ text: Schema.String, index });
export type TextFrame = Schema.Schema.Type<typeof TextFrame>;

export const GoalFrame = Schema.Struct({ goalData: GoalData, index });
export type GoalFrame = Schema.Schema.Type<typeof GoalFrame>;

export const Frame = Schema.Union([TextFrame, GoalFrame]);
export type Frame = Schema.Schema.Type<typeof Frame>;

/** The whole body of a widget update; the device replaces its cycle with these frames. */
export const Payload = Schema.Struct({ frames: Schema.Array(Frame) });
export type Payload = Schema.Schema.Type<typeof Payload>;

/**
 * Local push, against the device's own API. Neither the path nor the auth matches the cloud: the
 * device takes Basic `dev:<api key>` where the cloud takes an `X-Access-Token`.
 */
export const localWidgetPath = (widgetId: string): string => `/api/v2/widget/update/${DIY_PACKAGE}/${widgetId}`;

/** Cloud push, against a published indicator app. */
export const cloudWidgetPath = (appId: string, widgetId: string): string =>
  `/api/v1/dev/widget/update/${appId}/${widgetId}`;

/** The device's installed apps, from which the DIY widget's UUID is discovered. */
export const DEVICE_APPS_PATH = '/api/v2/device/apps';
