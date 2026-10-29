//
// Copyright 2026 DXOS.org
//

import { isHandDrag } from '@dxos/react-ui-canvas/headless';

/**
 * What a press does to the camera: `orbit`, `pan` (shift or the right button), or nothing when a tool has the left
 * button (`secondary`) and the command key is not held — holding it lends the left button to the camera, as the 2D
 * canvas pans with it.
 */
export const orbitGesture = (
  event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
  buttons: 'all' | 'secondary',
): 'orbit' | 'pan' | undefined => {
  if (buttons === 'secondary' && event.button === 0 && !isHandDrag(event)) {
    return undefined;
  }
  return event.shiftKey || event.button === 2 ? 'pan' : 'orbit';
};
