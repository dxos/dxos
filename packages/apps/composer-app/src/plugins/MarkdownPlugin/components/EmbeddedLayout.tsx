//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { Main } from '@dxos/aurora';

export const EmbeddedLayout = ({ children }: PropsWithChildren<{}>) => {
  return <Main.Content classNames='min-bs-[100vh] flex flex-col p-0.5'>{children}</Main.Content>;
};
