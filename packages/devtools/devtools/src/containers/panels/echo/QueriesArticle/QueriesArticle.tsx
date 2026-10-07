//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Panel from '@dxos/react-ui/Panel';

import { useQueryMetrics } from '../../../../hooks/index.ts';
import { type ArticleProps } from '../../types.ts';
import { QueryMetricsTable } from './QueryMetricsTable.tsx';

/** Every ECHO query this page's client has run, grouped by query text. */
export const QueriesArticle = ({ role }: ArticleProps) => {
  const { queries, reset } = useQueryMetrics();

  return (
    <Panel.Root role={role}>
      <Panel.Body>
        <QueryMetricsTable queries={queries} onReset={reset} />
      </Panel.Body>
    </Panel.Root>
  );
};
