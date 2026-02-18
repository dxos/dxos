//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Script } from '@dxos/functions';
import { Layout } from '@dxos/react-ui';

import { useDeployState, useToolbarState } from '../../hooks';

import { TestPanel } from './TestPanel';

export type TestContainerProps = {
  role: string;
  script: Script.Script;
};

export const TestContainer = ({ role, script }: TestContainerProps) => {
  const state = useToolbarState();
  useDeployState({ state, script });
  return (
    <Layout.Main role={role}>
      <TestPanel functionUrl={state.value.functionUrl} />
    </Layout.Main>
  );
};
