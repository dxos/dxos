//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren } from 'react';

import { groupSurface, mx } from '@dxos/aurora-theme';

export const Container: FC<PropsWithChildren> = ({ children }) => {
  return <div className={mx('flex flex-col rounded gap-2', groupSurface)}>{children}</div>;
};
