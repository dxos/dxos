//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Chain as ChainType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart } from '@dxos/react-ui-theme';

import { PromptTemplate } from './PromptTemplate/PromptTemplate';

export const ChainMain: FC<{ chain: ChainType }> = ({ chain }) => {
  const space = getSpaceForObject(chain);
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, topbarBlockPaddingStart]}>
      {chain.prompts.map((prompt, i) => (
        <PromptTemplate key={i} source={prompt.source} />
      ))}
    </Main.Content>
  );
};
