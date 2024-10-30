//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type ChainType } from '../types';
import { Chain } from './Chain';

const PromptArticle: FC<{ chain: ChainType }> = ({ chain }) => {
  return (
    <div role='none' className={'row-span-2 is-full pli-2'}>
      <Chain chain={chain} />
    </div>
  );
};

export default PromptArticle;
