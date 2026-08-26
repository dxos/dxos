//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import type * as Protocol from '#protocol';

import { type BuildFrameOptions, buildFrame } from './frame';
import { useIcons } from './icons';

export type UseFrameOptions = Omit<BuildFrameOptions, 'icons'>;

/** React binding for {@link buildFrame}, resolving the icons the keys need from the app's sprite. */
export const useFrame = ({ device, keys, dials }: UseFrameOptions): Protocol.Frame => {
  const names = useMemo(() => keys.flatMap((key) => (key ? [key.icon] : [])), [keys]);
  const icons = useIcons(names);

  return useMemo(() => buildFrame({ device, keys, dials, icons }), [device, keys, dials, icons]);
};
