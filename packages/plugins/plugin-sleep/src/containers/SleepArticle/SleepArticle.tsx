//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';

import { type Dream } from '../../types';
import { BinauralPlayer, Editor } from '../../components';

export type SleepArticleProps = SurfaceComponentProps<Dream.Dream>;

export const SleepArticle = ({ role, subject: dream }: SleepArticleProps) => {
  return (
    <Panel.Root role={role} classNames='dx-article'>
      <Panel.Content>
        <Editor dream={dream} />
        <BinauralPlayer classNames='mt-4' />
      </Panel.Content>
    </Panel.Root>
  );
};
