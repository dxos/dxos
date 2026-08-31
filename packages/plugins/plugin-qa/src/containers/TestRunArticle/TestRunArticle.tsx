//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Icon, Panel } from '@dxos/react-ui';

import { StatusBadge } from '#components';
import { QaOperation, TestRun } from '#types';

export type TestRunArticleProps = AppSurface.ObjectArticleProps<TestRun.TestRun>;

/** One run: the per-case result table, plus the captured cases that never reported. */
export const TestRunArticle = ({ role, subject }: TestRunArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const [run] = useObject(subject);
  const [finishing, setFinishing] = useState(false);
  const unreported = TestRun.unreported(run);
  const { passed, total } = TestRun.tally(run);

  const handleFinish = useCallback(() => {
    if (!invokePromise) {
      return;
    }
    setFinishing(true);
    void invokePromise(
      QaOperation.CompleteRun,
      { run: Ref.make(subject) },
      { spaceId: Obj.getDatabase(subject)?.spaceId },
    ).finally(() => setFinishing(false));
  }, [invokePromise, subject]);

  return (
    <Panel.Root role={role}>
      <Panel.Content classNames='dx-container flex flex-col gap-4 p-4' data-testid='qa.run'>
        <header className='flex items-center gap-2'>
          <StatusBadge status={run.status} />
          <span className='grow font-mono text-sm'>{run.startedAt.slice(0, 19).replace('T', ' ')}</span>
          <span className='font-mono text-sm'>
            {passed}/{total}
          </span>
          {run.status === 'running' && (
            <button className='dx-button' disabled={finishing} onClick={handleFinish} data-testid='qa.run.finish'>
              <Icon icon='ph--flag-checkered--regular' size={4} />
              <span>Finish</span>
            </button>
          )}
        </header>

        <ul data-testid='qa.run.results'>
          {run.results.map((result) => (
            <li key={result.caseKey} className='flex items-start gap-2 py-1' data-testid='qa.run.result'>
              <span className='font-mono text-sm w-20 shrink-0'>{result.caseKey}</span>
              <StatusBadge status={result.status} />
              <span className='grow text-subdued text-sm'>{result.note ?? ''}</span>
              {result.artifacts && result.artifacts.length > 0 && (
                <span className='flex items-center gap-1 text-subdued text-sm'>
                  <Icon icon='ph--paperclip--regular' size={4} />
                  {result.artifacts.length}
                </span>
              )}
            </li>
          ))}
          {unreported.map((caseKey) => (
            <li key={caseKey} className='flex items-center gap-2 py-1' data-testid='qa.run.unreported'>
              <span className='font-mono text-sm w-20 shrink-0'>{caseKey}</span>
              <StatusBadge status='skipped' />
              <span className='grow text-subdued text-sm'>unreported</span>
            </li>
          ))}
        </ul>

        {run.summary && <p className='text-subdued'>{run.summary}</p>}
      </Panel.Content>
    </Panel.Root>
  );
};

TestRunArticle.displayName = 'TestRunArticle';

export default TestRunArticle;
