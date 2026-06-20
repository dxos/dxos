//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { meta } from '@dxos/plugin-integration';
import { Panel } from '@dxos/react-ui';

export const TokenManagerModule = () => {
  const data = useMemo(() => ({ attendableId: 'story', subject: `${meta.profile.key}.space-settings` }), []);

  return (
    <Panel.Root>
      <Panel.Content>
        <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
      </Panel.Content>
    </Panel.Root>
  );
};
