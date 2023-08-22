//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { Main } from '@dxos/aurora';
import { coarseBlockPaddingStart } from '@dxos/aurora-theme';

export const EmbeddedLayout = ({ children }: PropsWithChildren<{}>) => {
  return (
    <Main.Content classNames={['min-bs-[100dvh] flex flex-col p-0.5', coarseBlockPaddingStart]}>
      {children}
    </Main.Content>
  );
};
