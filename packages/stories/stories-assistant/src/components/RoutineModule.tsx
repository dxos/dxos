//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Instructions } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

export const RoutineModule = ({ space }: { space: Space }) => {
  const [instructions] = useQuery(space.db, Filter.type(Instructions.Instructions));
  const data = useMemo(() => ({ attendableId: 'story', subject: instructions }), [instructions]);

  return (
    <Panel.Root>
      <Panel.Content>
        <Surface.Surface type={AppSurface.Article} limit={1} data={data} />
      </Panel.Content>
    </Panel.Root>
  );
};
