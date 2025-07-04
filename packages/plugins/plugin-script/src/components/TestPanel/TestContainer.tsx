//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ScriptType } from '@dxos/functions';
import { StackItem } from '@dxos/react-ui-stack';

import { TestPanel } from './TestPanel';
import { useDeployState, useToolbarState } from '../../hooks';

export const TestContainer = ({ script, role }: { script: ScriptType; role: string }) => {
  const state = useToolbarState();
  useDeployState({ state, script });
  return (
    <StackItem.Content role={role}>
      <TestPanel functionUrl={state.functionUrl} />
    </StackItem.Content>
  );
};
