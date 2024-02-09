//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { ChatContainer } from './ChatContainer';

const ThreadMain: FC<{ thread: ThreadType }> = ({ thread }) => {
  const space = getSpaceForObject(thread);
  if (!space) {
    return null;
  }

  // TODO(burdon): Factor out Main container across plugins?
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <ChatContainer space={space} thread={thread} />
    </Main.Content>
  );
};

export default ThreadMain;
