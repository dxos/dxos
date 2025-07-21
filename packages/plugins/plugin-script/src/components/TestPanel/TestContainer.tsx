//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ScriptType } from '@dxos/functions';
import { StackItem } from '@dxos/react-ui-stack';

import { TestPanel } from './TestPanel';
import { useDeployState, useToolbarState } from '../../hooks';

export type TestContainerProps = {
  role: string;
  script: ScriptType;
};

export const TestContainer = ({ script, role }: TestContainerProps) => {
  const state = useToolbarState();
  useDeployState({ state, script });
  return (
    <StackItem.Content role={role}>
      <TestPanel functionUrl={state.functionUrl} />
    </StackItem.Content>
  );
};
