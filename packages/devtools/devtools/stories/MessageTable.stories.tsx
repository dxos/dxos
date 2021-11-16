//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/crypto';
import { IFeedGenericBlock } from '@dxos/echo-protocol';
import { FullScreen } from '@dxos/react-components';

import { MessageTable } from '../src';

export default {
  title: 'devtools/MessageTable'
};

export const Primary = () => {
  const messages: IFeedGenericBlock[] = [...new Array(20)].map((_, i) => ({
    key: PublicKey.random().toHex(),
    seq: i,
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
  )
}
