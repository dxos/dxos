//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Icon } from '@dxos/react-ui';

import { QaOperation, type TestCase, TestRun } from '#types';

import { StatusBadge } from '../StatusBadge';

export type RunResultsProps = { run: TestRun.TestRun };

/**
 * A run's per-case results, plus the captured cases that never reported. Shared by the run's own
 * article and the expanded feed row on the plan, so both offer the same controls.
 */
export const RunResults = ({ run }: RunResultsProps) => {
  const { invokePromise } = useOperationInvoker();
  const [error, setError] = useState<string | undefined>();
  const [completing, setCompleting] = useState(false);
  // Read through the snapshot so results appearing on the run re-render this list; the operations
  // still take a ref to the live object.
  const [snapshot] = useObject(run);
  const unreported = TestRun.unreported(snapshot);

  const handlePush = useCallback(
    (caseKey: string, status: TestCase.ResultStatus) => {
      if (!invokePromise) {
        return;
      }
      // invokePromise resolves handler failures as `{ error }` rather than rejecting.
      void invokePromise(
        QaOperation.PushResult,
        { run: Ref.make(run), caseKey, status },
        { spaceId: Obj.getDatabase(run)?.spaceId },
      ).then(({ error }) => setError(error ? String(error) : undefined));
    },
    [invokePromise, run],
  );

  const handleComplete = useCallback(() => {
    // A second activation before the first settles would seal, then report the expected
    // "already sealed" refusal as if the completion itself had failed.
    if (!invokePromise || completing) {
      return;
    }
    setCompleting(true);
    void invokePromise(QaOperation.CompleteRun, { run: Ref.make(run) }, { spaceId: Obj.getDatabase(run)?.spaceId })
      .then(({ error }) => setError(error ? String(error) : undefined))
      .finally(() => setCompleting(false));
  }, [invokePromise, run, completing]);

  return (
    <div className='flex flex-col gap-1 ps-6' data-testid='qa.run.results'>
      {snapshot.results.map((result) => (
        <div key={result.caseKey} className='flex items-center gap-2' data-testid='qa.run.result'>
          <span className='font-mono text-sm w-20 shrink-0'>{result.caseKey}</span>
          <StatusBadge status={result.status} />
          <span className='grow text-subdued text-sm'>{result.note ?? ''}</span>
          {result.artifacts && result.artifacts.length > 0 && (
            <span className='flex items-center gap-1 text-subdued text-sm'>
              <Icon icon='ph--paperclip--regular' size={4} />
              {result.artifacts.length}
            </span>
          )}
        </div>
      ))}

      {unreported.map((caseKey) => (
        <div key={caseKey} className='flex items-center gap-2' data-testid='qa.run.unreported'>
          <span className='font-mono text-sm w-20 shrink-0'>{caseKey}</span>
          {/* `skipped` is a terminal outcome, and a case can still report while the run is open. */}
          {snapshot.status === 'running' ? (
            <span className='flex items-center gap-1 text-subdued'>
              <Icon icon='ph--circle-dashed--regular' size={4} />
              <span className='text-sm'>pending</span>
            </span>
          ) : (
            <StatusBadge status='skipped' />
          )}
          <span className='grow text-subdued text-sm'>unreported</span>
          {snapshot.status === 'running' && (
            <>
              <button className='dx-button' onClick={() => handlePush(caseKey, 'passed')} data-testid='qa.run.pass'>
                Pass
              </button>
              <button className='dx-button' onClick={() => handlePush(caseKey, 'failed')} data-testid='qa.run.fail'>
                Fail
              </button>
            </>
          )}
        </div>
      ))}

      {snapshot.status === 'running' && (
        <div className='flex justify-end pt-1'>
          <button className='dx-button' disabled={completing} onClick={handleComplete} data-testid='qa.run.complete'>
            <Icon icon='ph--flag-checkered--regular' size={4} />
            <span>Finish run</span>
          </button>
        </div>
      )}

      {snapshot.summary && <p className='text-subdued text-sm'>{snapshot.summary}</p>}

      {error && (
        <p className='text-redText text-sm' role='alert' data-testid='qa.run.error'>
          {error}
        </p>
      )}
    </div>
  );
};

RunResults.displayName = 'RunResults';
