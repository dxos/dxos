//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { InvocationTraceContainer, type InvocationTraceContainerProps } from './InvocationTraceContainer';
import { useDevtoolsState } from '../../../hooks';

export type InvocationTracePanelProps = Pick<InvocationTraceContainerProps, 'target' | 'detailAxis'>;

export const InvocationTracePanel = ({ detailAxis = 'inline', ...props }: InvocationTracePanelProps) => {
  const state = useDevtoolsState();
  return <InvocationTraceContainer detailAxis={detailAxis} showSpaceSelector space={state.space} {...props} />;
};
