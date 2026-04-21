//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { meta as automationMeta } from '@dxos/plugin-automation';

export const TriggersModule = () => {
  return (
    <Surface.Surface
      type={AppSurface.Article}
      data={{
        attendableId: 'story',
        subject: `${automationMeta.id}.space-settings-automation`,
      }}
    />
  );
};
