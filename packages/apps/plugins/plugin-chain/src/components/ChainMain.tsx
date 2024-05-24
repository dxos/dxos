//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type ChainType } from '@braneframe/types';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  bottombarBlockPaddingEnd,
  mx,
  textBlockWidth,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import { Chain } from './Chain';

const ChainMain: FC<{ chain: ChainType }> = ({ chain }) => (
  <Main.Content classNames={[baseSurface, topbarBlockPaddingStart, bottombarBlockPaddingEnd, textBlockWidth]}>
    <div role='none' className={mx(textBlockWidth, 'pli-2')}>
      <Chain chain={chain} />
    </div>
  </Main.Content>
);

export default ChainMain;
