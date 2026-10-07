//
// Copyright 2020 DXOS.org
//

import React from 'react';

import * as Panel from '@dxos/react-ui/Panel';

import { type ArticleProps } from '../../types.ts';
import { SignalMessageTable } from './SignalMessageTable.tsx';
import { SignalStatusTable } from './SignalStatusTable.tsx';

export const SignalArticle = ({ role }: ArticleProps) => {
  return (
    <Panel.Root role={role}>
      <Panel.Body classNames='grid grid-rows-[2fr_5fr]'>
        <SignalStatusTable />
        <SignalMessageTable />
      </Panel.Body>
    </Panel.Root>
  );
};
