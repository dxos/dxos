//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { Chain } from './Chain';
import { type ChainType } from '../types';

const ChainArticle: FC<{ chain: ChainType }> = ({ chain }) => {
  return (
    <div role='none' className={'is-full pli-2 row-span-2'}>
      <Chain chain={chain} />
    </div>
  );
};

export default ChainArticle;
