//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useDevtoolsState } from '../../../hooks';

import { InvocationTraceContainer, type InvocationTraceContainerProps } from './InvocationTraceContainer';

export type InvocationTracePanelProps = Pick<InvocationTraceContainerProps, 'target' | 'detailAxis'>;

export const InvocationTracePanel = ({ detailAxis = 'inline', ...props }: InvocationTracePanelProps) => {
  const state = useDevtoolsState();
  return <InvocationTraceContainer detailAxis={detailAxis} showSpaceSelector db={state.space?.db} {...props} />;
};
