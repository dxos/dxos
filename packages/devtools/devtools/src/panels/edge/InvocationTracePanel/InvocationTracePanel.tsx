//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useDevtoolsState } from '../../../hooks';

import { InvocationTraceContainer, type InvocationTraceContainerProps } from './InvocationTraceContainer';

export type InvocationTracePanelProps = Pick<
  InvocationTraceContainerProps,
  'db' | 'queueDxn' | 'target' | 'detailAxis'
>;

export const InvocationTracePanel = ({ detailAxis = 'inline', ...props }: InvocationTracePanelProps) => {
  const state = useDevtoolsState();
  return <InvocationTraceContainer db={state.space?.db} detailAxis={detailAxis} showSpaceSelector {...props} />;
};
