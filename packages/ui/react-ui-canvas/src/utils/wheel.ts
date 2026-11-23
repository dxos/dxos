//
// Copyright 2026 DXOS.org
//

/** The wheel fields a trackpad check reads; a `WheelEvent` has them. */
export type WheelLike = { deltaY: number; deltaMode: number };

/** `WheelEvent.DOM_DELTA_PIXEL`, here so the check runs where `WheelEvent` is not defined. */
const DOM_DELTA_PIXEL = 0;

/**
 * Whether a wheel event comes from a trackpad (a two-finger scroll) rather than a mouse wheel, so a vertical swipe can
 * pan while a wheel notch zooms. Chromium and WebKit report a trackpad's legacy `wheelDeltaY` as exactly -3 times its
 * `deltaY` and a wheel's in 120-unit notches; Firefox, without the legacy field, reports a wheel in lines.
 */
export const isTrackpadScroll = (event: WheelLike): boolean => {
  const legacy: unknown = Reflect.get(event, 'wheelDeltaY');
  if (typeof legacy === 'number' && legacy !== 0) {
    return legacy === -3 * event.deltaY;
  }
  return event.deltaMode === DOM_DELTA_PIXEL;
};
