//
// Copyright 2026 DXOS.org
//

import { type Space } from '@dxos/client/echo';

/** Human label for a space progress monitor. */
export const getSpaceProgressLabel = (space: Space, suffix?: string): string => {
  const name = space.properties.name?.length ? space.properties.name : 'Space';
  return suffix ? `${name} · ${suffix}` : name;
};
