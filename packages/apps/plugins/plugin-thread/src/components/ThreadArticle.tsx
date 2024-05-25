//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type ThreadType } from '@braneframe/types';

import { ChatContainer } from './ChatContainer';

const ThreadArticle: FC<{ thread: ThreadType }> = ({ thread }) => {
  // TODO(burdon): Factor out Main container across plugins?
  return (
    <div role='none' className='row-span-2'>
      <ChatContainer thread={thread} />
    </div>
  );
};

export default ThreadArticle;
