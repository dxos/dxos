//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui/next';

import { type ArticleProps } from '../../types.ts';
import { SignalMessageTable } from './SignalMessageTable.tsx';
import { SignalStatusTable } from './SignalStatusTable.tsx';

export const SignalArticle = ({ role }: ArticleProps) => {
  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Body classNames='grid grid-rows-[2fr_5fr]'>
        <SignalStatusTable />
        <SignalMessageTable />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
