//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type ThreadType } from '@braneframe/types';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { ChatContainer } from './ChatContainer';

const ThreadMain: FC<{ thread: ThreadType }> = ({ thread }) => {
  // TODO(burdon): Factor out Main container across plugins?
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <ChatContainer thread={thread} />
    </Main.Content>
  );
};

export default ThreadMain;
