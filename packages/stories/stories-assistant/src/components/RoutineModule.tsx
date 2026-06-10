//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Routine } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

export const RoutineModule = ({ space }: { space: Space }) => {
  const [prompt] = useQuery(space.db, Filter.type(Routine.Routine));
  const data = useMemo(() => ({ attendableId: 'story', subject: prompt }), [prompt]);

  return (
    <Panel.Root>
      <Panel.Content>
        <Surface.Surface type={AppSurface.Article} limit={1} data={data} />
      </Panel.Content>
    </Panel.Root>
  );
};
