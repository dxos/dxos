//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { Icon, Panel } from '@dxos/react-ui';

import { StatusBadge } from '#components';
import { QaOperation, type TestCase, TestPlan, TestRun } from '#types';

export type TestPlanArticleProps = AppSurface.ObjectArticleProps<TestPlan.TestPlan>;

/** The plan surface: the declared cases above the feed of runs, newest first. */
export const TestPlanArticle = ({ role, subject }: TestPlanArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const [plan] = useObject(subject);
  const [starting, setStarting] = useState(false);
  // Each case resolves through its own atom, so the list re-renders per ref rather than wholesale.
  const cases: Obj.Snapshot<TestCase.TestCase>[] = useAtomValue(
    useMemo(
      () =>
        Atom.make((get) =>
          plan.cases.flatMap((ref) => {
            const value = get(Obj.atom(ref));
            return value ? [value] : [];
          }),
        ),
      [plan.cases],
    ),
  );
  // Runs live in the plan's feed, so the query is scoped to it rather than to the whole database.
  const feed = useResolveRef(plan.feed);
  const runs = useQuery(
    Obj.getDatabase(subject),
    feed
      ? Query.select(Filter.type(TestRun.TestRun)).from([Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))])
      : Query.select(Filter.nothing()),
  );
  // The feed appends in execution order; the surface reads newest first.
  const newestFirst = useMemo(() => [...runs].reverse(), [runs]);

  const handleStartRun = useCallback(() => {
    if (!invokePromise) {
      return;
    }
    setStarting(true);
    void invokePromise(
      QaOperation.StartRun,
      { plan: Ref.make(subject) },
      { spaceId: Obj.getDatabase(subject)?.spaceId },
    ).finally(() => setStarting(false));
  }, [invokePromise, subject]);

  return (
    <Panel.Root role={role}>
      <Panel.Content classNames='dx-container flex flex-col gap-4 p-4' data-testid='qa.plan'>
        <header className='flex items-center gap-2'>
          <Icon icon='ph--check-square-offset--regular' size={5} />
          <h1 className='grow text-lg'>{plan.name}</h1>
          <button className='dx-button' disabled={starting} onClick={handleStartRun} data-testid='qa.plan.start-run'>
            <Icon icon='ph--play--regular' size={4} />
            <span>Run</span>
          </button>
        </header>

        <section>
          <h2 className='text-sm text-subdued'>Cases</h2>
          {cases.length === 0 ? (
            <p className='text-subdued' data-testid='qa.plan.no-cases'>
              No cases yet.
            </p>
          ) : (
            <ul data-testid='qa.plan.cases'>
              {cases.map((testCase) => (
                <li key={testCase.id} className='flex gap-2 py-1'>
                  <span className='font-mono text-sm w-20 shrink-0'>{testCase.key}</span>
                  <span className='grow'>{testCase.title}</span>
                  <span className='text-subdued text-sm'>{testCase.steps.length} steps</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className='text-sm text-subdued'>Runs</h2>
          {newestFirst.length === 0 ? (
            <p className='text-subdued' data-testid='qa.plan.no-runs'>
              No runs yet.
            </p>
          ) : (
            <ul data-testid='qa.plan.runs'>
              {newestFirst.map((run) => {
                const { passed, total } = TestRun.tally(run);
                return (
                  <li key={run.id} className='flex items-center gap-2 py-1' data-testid='qa.plan.run'>
                    <StatusBadge status={run.status} />
                    <span className='font-mono text-sm'>{run.startedAt.slice(0, 19).replace('T', ' ')}</span>
                    <span className='grow text-subdued text-sm'>{run.target?.ref ?? run.runner?.name ?? ''}</span>
                    <span className='font-mono text-sm'>
                      {passed}/{total}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Panel.Content>
    </Panel.Root>
  );
};

TestPlanArticle.displayName = 'TestPlanArticle';

export default TestPlanArticle;
