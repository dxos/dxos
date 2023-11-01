//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { ThreadContainer } from './ThreadContainer';

export const ThreadMain: FC<{ thread: ThreadType }> = ({ thread }) => {
  const space = getSpaceForObject(thread);
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <ThreadContainer space={space} thread={thread} />
    </Main.Content>
  );
};
