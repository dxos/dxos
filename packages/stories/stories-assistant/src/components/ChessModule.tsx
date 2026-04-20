//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Chess } from '@dxos/plugin-chess';
import { useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const ChessModule: FC<ComponentProps> = ({ space }) => {
  const objects = useQuery(space.db, Filter.type(Chess.Game));
  const chess = objects.at(-1);

  return <Surface.Surface type={AppSurface.Section} limit={1} data={{ subject: chess }} />;
};
