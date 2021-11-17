//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { randomBytes } from '@dxos/crypto';
import { IFeedGenericBlock } from '@dxos/echo-protocol';
import { FullScreen } from '@dxos/react-components';

import { MessageTable } from '../src';

export default {
  title: 'devtools/MessageTable'
};

export const Primary = () => {
  const messages: IFeedGenericBlock<any>[] = [...new Array(20)].map((_, i) => ({
    key: randomBytes(),
    seq: i,
    sync: true,
    path: '',
    data: { // TODO(burdon): Generate protos.
      info: {
        value: true
      }
    }
  }));

  return (
    <FullScreen>
      <MessageTable
        messages={messages}
      />
    </FullScreen>
  );
};
