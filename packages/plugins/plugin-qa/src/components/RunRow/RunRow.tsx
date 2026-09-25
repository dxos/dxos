//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useObject } from '@dxos/echo-react';
import { Icon } from '@dxos/react-ui';

import { type TestRun } from '#types';

import { RunResults } from '../RunResults/index.ts';
import { StatusBadge } from '../StatusBadge/index.ts';

export type RunRowProps = {
  run: TestRun.TestRun;
  expanded: boolean;
  onToggle: () => void;
};

/**
 * One row of the plan's run feed. It subscribes to its own run — a query subscription fires on the
 * result set, not on a mutation inside a row, so the tally would otherwise sit at its initial value
 * while the expanded results below it updated.
 */
export const RunRow = ({ run, expanded, onToggle }: RunRowProps) => {
  const [snapshot] = useObject(run);
  const passed = snapshot.results.filter((result) => result.status === 'passed').length;

  return (
    <>
      <button
        className='flex items-center gap-2 py-1 w-full text-start'
        onClick={onToggle}
        data-testid='qa.plan.run-toggle'
      >
        <Icon icon={expanded ? 'ph--caret-down--regular' : 'ph--caret-right--regular'} size={4} />
        <StatusBadge status={snapshot.status} />
        <span className='font-mono text-sm'>{snapshot.startedAt.slice(0, 19).replace('T', ' ')}</span>
        <span className='grow text-subdued text-sm'>{snapshot.target?.ref ?? snapshot.runner?.name ?? ''}</span>
        <span className='font-mono text-sm' data-testid='qa.plan.run-tally'>
          {passed}/{snapshot.cases.length}
        </span>
      </button>
      {expanded && <RunResults run={run} />}
    </>
  );
};

RunRow.displayName = 'RunRow';
