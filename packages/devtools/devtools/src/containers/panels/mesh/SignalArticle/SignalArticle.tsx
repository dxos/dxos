//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';

import { type ArticleProps } from '../../types.ts';
import { SignalMessageTable } from './SignalMessageTable.tsx';
import { SignalStatusTable } from './SignalStatusTable.tsx';

export const SignalArticle = ({ role }: ArticleProps) => {
  return (
    <Panel.Root role={role}>
      <Panel.Content classNames='grid grid-rows-[2fr_5fr]'>
        <SignalStatusTable />
        <SignalMessageTable />
      </Panel.Content>
    </Panel.Root>
  );
};
