//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { meta } from '@dxos/plugin-connector';
import { type ModuleProps } from '@dxos/story-modules';

export const TokenManagerModule = ({ attendableId }: ModuleProps) => {
  const data = useMemo(() => ({ attendableId, subject: `${meta.profile.key}.space-settings` }), [attendableId]);

  return <Surface.Surface type={AppSurface.Article} data={data} limit={1} />;
};
