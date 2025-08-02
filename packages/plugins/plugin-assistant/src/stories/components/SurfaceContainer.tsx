//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { type ComponentProps } from './types';
import { Surface } from '@dxos/app-framework';
import { Filter } from '@dxos/echo';
import { Chess } from '@dxos/plugin-chess/types';
import { useQuery } from '@dxos/react-client/echo';

export const SurfaceContainer = ({ space }: ComponentProps) => {
  // TODO(burdon): Query for chat artifacts from binder.
  const [object] = useQuery(space, Filter.type(Chess.Game));
  if (!object) {
    return null;
  }

  return <Surface role='article' limit={1} data={{ subject: object }} />;
};
