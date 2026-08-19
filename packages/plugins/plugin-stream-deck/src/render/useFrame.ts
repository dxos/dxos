//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type DialSpec, type KeySpec } from '#model';
import type * as Protocol from '#protocol';

import { renderDial } from './dial';
import { useIcons } from './icons';
import { renderEmptyKey, renderKey } from './key';

export type UseFrameOptions = {
  device: Protocol.DeviceProfile;
  keys: readonly (KeySpec | null)[];
  dials: readonly (DialSpec | null)[];
};

/**
 * Builds the frame that is both sent to the device and shown on screen.
 *
 * Single source of pixels on purpose: if the panel and the hardware rendered separately they would
 * drift, and the panel is how the layout gets reviewed.
 */
export const useFrame = ({ device, keys, dials }: UseFrameOptions): Protocol.Frame => {
  const names = useMemo(() => keys.flatMap((key) => (key ? [key.icon] : [])), [keys]);
  const icons = useIcons(names);

  return useMemo(
    () => ({
      _tag: 'frame' as const,
      keys: keys.map((key) =>
        key
          ? { svg: renderKey(key, { size: device.keySize[0], icon: icons[key.icon] }), target: key.target }
          : { svg: renderEmptyKey(device.keySize[0]) },
      ),
      dials: dials.map((dial) => (dial ? renderDial(dial) : null)),
    }),
    [device, keys, dials, icons],
  );
};
