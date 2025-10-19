//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { Surface } from '@dxos/app-framework';
import { Filter } from '@dxos/echo';
import { Chess } from '@dxos/plugin-chess';
import { useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const ChessContainer: FC<ComponentProps> = ({ space }) => {
  const chess = useQuery(space, Filter.type(Chess.Game));
  return <Surface role='section' limit={1} data={{ subject: chess.at(-1) }} />;
};
