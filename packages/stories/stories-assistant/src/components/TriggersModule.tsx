//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { meta as automationMeta } from '@dxos/plugin-automation';

export const TriggersModule = () => {
  return (
    <Surface.Surface
      role='article'
      data={{
        subject: `${automationMeta.id}/space-settings-automation`,
      }}
    />
  );
};
