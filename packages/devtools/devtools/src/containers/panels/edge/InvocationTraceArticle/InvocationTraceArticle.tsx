//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useDevtoolsState } from '../../../../hooks/index.ts';
import { InvocationTraceContainer, type InvocationTraceContainerProps } from './InvocationTraceContainer.tsx';

export type InvocationTraceArticleProps = Pick<
  InvocationTraceContainerProps,
  'role' | 'db' | 'feedDXN' | 'target' | 'detailAxis'
>;

export const InvocationTraceArticle = ({ detailAxis = 'inline', ...props }: InvocationTraceArticleProps) => {
  const state = useDevtoolsState();
  return <InvocationTraceContainer db={state.space?.db} detailAxis={detailAxis} showSpaceSelector {...props} />;
};
