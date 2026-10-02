//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui';

import { useQueryMetrics } from '../../../../hooks/index.ts';
import { type ArticleProps } from '../../types.ts';
import { QueryMetricsTable } from './QueryMetricsTable.tsx';

/** Every ECHO query this page's client has run, grouped by query text. */
export const QueriesArticle = ({ role }: ArticleProps) => {
  const { queries, reset } = useQueryMetrics();

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Body>
        <QueryMetricsTable queries={queries} onReset={reset} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
