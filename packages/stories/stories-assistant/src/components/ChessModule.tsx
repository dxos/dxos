//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Game } from '@dxos/plugin-game';
import { useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { type ModuleProps } from './types';

export const ChessModule = ({ space }: ModuleProps) => {
  const objects = useQuery(space.db, Filter.type(Game));
  const game = objects.at(-1);

  return (
    <Panel.Root>
      <Panel.Content>
        <Surface.Surface type={AppSurface.Section} limit={1} data={{ subject: game, attendableId: 'story' }} />
      </Panel.Content>
    </Panel.Root>
  );
};
