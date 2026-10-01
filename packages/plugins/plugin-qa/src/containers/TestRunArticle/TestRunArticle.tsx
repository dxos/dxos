//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Next } from '@dxos/react-ui/next';

import { RunResults, StatusBadge } from '#components';
import { type TestRun } from '#types';

export type TestRunArticleProps = AppSurface.ObjectArticleProps<TestRun.TestRun>;

/** One run on its own surface: the same result table the plan's feed row expands to. */
export const TestRunArticle = ({ role, subject }: TestRunArticleProps) => {
  const [run] = useObject(subject);

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Body classNames='flex flex-col gap-4 p-4' data-testid='qa.run'>
        <header className='flex items-center gap-2'>
          <StatusBadge status={run.status} />
          <span className='grow font-mono text-sm'>{run.startedAt.slice(0, 19).replace('T', ' ')}</span>
        </header>
        <RunResults run={subject} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

TestRunArticle.displayName = 'TestRunArticle';

export default TestRunArticle;
