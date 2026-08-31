//
// Copyright 2026 DXOS.org
//

import { type MetricSpec, type Shortcut } from '@dxos/plugin-space/dashboard';

import type * as Protocol from '#protocol';

import { renderDial } from './dial';
import { type IconMarkup, renderEmptyKey, renderKey } from './key';

export type BuildFrameOptions = {
  device: Protocol.DeviceProfile;
  keys: readonly (Shortcut | null)[];
  dials: readonly (MetricSpec | null)[];
  /** Inline icon markup by icon name; a missing entry renders the key without its glyph. */
  icons?: Record<string, IconMarkup>;
};

/**
 * Assembles the frame sent to the device, which is also what the on-screen replica renders.
 *
 * Single source of pixels on purpose: rendering the panel and the hardware separately would let them
 * drift, and the panel is how the layout gets reviewed. Pure, so it is testable without a device or
 * a DOM — the icon markup is passed in.
 */
export const buildFrame = ({ device, keys, dials, icons = {} }: BuildFrameOptions): Protocol.Frame => ({
  _tag: 'frame',
  keys: keys.map((key) =>
    key
      ? { svg: renderKey(key, { size: device.keySize[0], icon: icons[key.icon] }), target: key.target }
      : { svg: renderEmptyKey(device.keySize[0]) },
  ),
  dials: dials.map((dial) => (dial ? renderDial(dial) : null)),
});
