//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Script } from '@dxos/functions';
import { StackItem } from '@dxos/react-ui-stack';

import { useDeployState, useToolbarState } from '../../hooks';

import { TestPanel } from './TestPanel';

export type TestContainerProps = {
  role: string;
  script: Script.Script;
};

export const TestContainer = ({ script }: TestContainerProps) => {
  const state = useToolbarState();
  useDeployState({ state, script });
  return (
    <StackItem.Content>
      <TestPanel functionUrl={state.functionUrl} />
    </StackItem.Content>
  );
};
