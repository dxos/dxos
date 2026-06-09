//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { meta as automationMeta } from '@dxos/plugin-automation';
import { Panel } from '@dxos/react-ui';

export const TriggersModule = () => {
  return (
    <Panel.Root>
      <Panel.Content>
        <Surface.Surface
          type={AppSurface.Article}
          data={{
            attendableId: 'story',
            subject: `${automationMeta.id}.space-settings-automation`,
          }}
        />
      </Panel.Content>
    </Panel.Root>
  );
};
