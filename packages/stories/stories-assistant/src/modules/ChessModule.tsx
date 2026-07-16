//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Game } from '@dxos/plugin-game';
import { useQuery } from '@dxos/react-client/echo';
import { type ModuleProps } from '@dxos/story-modules';

export const ChessModule = ({ space }: ModuleProps) => {
  // TODO(burdon): Fix.
  const objects = useQuery(space.db, Filter.type(Game.Game));
  const game = objects.at(-1);

  return <Surface.Surface type={AppSurface.Section} limit={1} data={{ subject: game, attendableId: 'story' }} />;
};
