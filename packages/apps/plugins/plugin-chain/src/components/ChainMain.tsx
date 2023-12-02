//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Chain as ChainType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart } from '@dxos/react-ui-theme';

export const ChainMain: FC<{ chain: ChainType }> = ({ chain }) => {
  const space = getSpaceForObject(chain);
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, topbarBlockPaddingStart]}>
      <pre>
        <code>{JSON.stringify(chain)}</code>
      </pre>
    </Main.Content>
  );
};
