//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type SurfaceDebugProps = ThemedClassName<{}>;

export const SurfaceDebug = ({ classNames }: SurfaceDebugProps) => {
  return <div className={mx('flex flex-col border border-separator', classNames)}>SurfaceDebug</div>;
};
