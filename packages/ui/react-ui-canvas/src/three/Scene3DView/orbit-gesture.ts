//
// Copyright 2026 DXOS.org
//

import { isHandDrag } from '../../model/index.ts';
import { type WheelLike, isTrackpadScroll } from '../../utils/index.ts';

/**
 * What a press does to the camera: `orbit`, `pan` (with Shift), or nothing (the right button, which opens the menu) when a tool has the left
 * button (`secondary`) and the command key is not held — holding it lends the left button to the camera, as the 2D
 * canvas pans with it.
 */
export const orbitGesture = (
  event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
  buttons: 'all' | 'secondary',
): 'orbit' | 'pan' | undefined => {
  // The right button opens the context menu, as in 2D.
  if (event.button === 2 || (buttons === 'secondary' && event.button === 0 && !isHandDrag(event))) {
    return undefined;
  }
  return event.shiftKey ? 'pan' : 'orbit';
};

/** What a wheel event does to the 3D camera. */
export type WheelGesture =
  | { kind: 'zoom'; factor: number }
  | { kind: 'orbit'; delta: { x: number; y: number } }
  | { kind: 'pan'; delta: { x: number; y: number } };

/**
 * A wheel event as a camera move, classified as the 2D canvas classifies it: a trackpad pinch (reported with the control
 * key) zooms; a two-finger trackpad swipe orbits the way the fingers move (Shift pans), where 2D pans; a mouse-wheel
 * notch zooms. Pinches report small deltas, so they zoom at a steeper rate.
 */
export const wheelGesture = (
  event: WheelLike & { deltaX: number; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
): WheelGesture => {
  if (event.ctrlKey || event.metaKey) {
    return { kind: 'zoom', factor: Math.exp(event.deltaY * 0.006) };
  }
  if (event.shiftKey || isTrackpadScroll(event)) {
    // A swipe scrolls content against the fingers, so the camera moves with them: the opposite of the deltas.
    return { kind: event.shiftKey ? 'pan' : 'orbit', delta: { x: -event.deltaX, y: -event.deltaY } };
  }
  return { kind: 'zoom', factor: Math.exp(event.deltaY * 0.002) };
};
