//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps, type FC } from 'react';

import { ChatContainer } from './ChatContainer';

const ThreadArticle: FC<Pick<ComponentProps<typeof ChatContainer>, 'thread' | 'context'>> = (props) => {
  // TODO(burdon): Factor out Main container across plugins?
  return (
    <div role='none' className='row-span-2'>
      <ChatContainer {...props} />
    </div>
  );
};

export default ThreadArticle;
