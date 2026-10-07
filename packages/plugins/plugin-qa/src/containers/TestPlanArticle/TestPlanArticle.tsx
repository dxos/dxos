//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';

import { RunRow } from '#components';
import { QaOperation, type TestCase, TestPlan, TestRun } from '#types';

export type TestPlanArticleProps = AppSurface.ObjectArticleProps<TestPlan.TestPlan>;

/** The plan surface: the declared cases above the feed of runs, newest first. */
export const TestPlanArticle = ({ role, subject }: TestPlanArticleProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const [plan] = useObject(subject);
  const [starting, setStarting] = useState(false);
  const [caseKey, setCaseKey] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [expanded, setExpanded] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
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

  const handleAddCase = useCallback(() => {
    if (!invokePromise || caseKey.trim().length === 0) {
      return;
    }
    void invokePromise(
      QaOperation.SetCase,
      { plan: Ref.make(subject), key: caseKey.trim(), title: caseTitle.trim() || caseKey.trim() },
      { spaceId: Obj.getDatabase(subject)?.spaceId },
    ).then(({ error }) => {
      // invokePromise resolves handler failures as `{ error }` rather than rejecting.
      setError(error ? String(error) : undefined);
      if (!error) {
        setCaseKey('');
        setCaseTitle('');
      }
    });
  }, [invokePromise, subject, caseKey, caseTitle]);

  const handleStartRun = useCallback(() => {
    if (!invokePromise) {
      return;
    }
    setStarting(true);
    void invokePromise(
      QaOperation.StartRun,
      { plan: Ref.make(subject) },
      { spaceId: Obj.getDatabase(subject)?.spaceId },
    )
      .then(({ error }) => setError(error ? String(error) : undefined))
      .finally(() => setStarting(false));
  }, [invokePromise, subject]);

  return (
    <Panel.Root role={role}>
      <Panel.Body classNames='flex flex-col gap-4 p-4' data-testid='qa.plan'>
        <header className='flex items-center gap-2'>
          <Icon.Icon icon='ph--check-square-offset--regular' size='lg' />
          <h1 className='grow text-lg'>{plan.name}</h1>
          <Button.Root disabled={starting} onClick={handleStartRun} data-testid='qa.plan.start-run'>
            <Icon.Icon icon='ph--play--regular' size='md' />
            <span>Run</span>
          </Button.Root>
        </header>

        {error && (
          <p className='text-red-text text-sm' role='alert' data-testid='qa.plan.error'>
            {error}
          </p>
        )}

        <section>
          <Field.Label>Cases</Field.Label>
          <div className='flex gap-2 py-2'>
            <Input.Root
              classNames='w-24'
              placeholder='Key'
              value={caseKey}
              onChange={(event) => setCaseKey(event.target.value)}
              data-testid='qa.plan.case-key'
            />
            <Input.Root
              classNames='grow'
              placeholder='Title'
              value={caseTitle}
              onChange={(event) => setCaseTitle(event.target.value)}
              data-testid='qa.plan.case-title'
            />
            <Button.Root disabled={caseKey.trim().length === 0} onClick={handleAddCase} data-testid='qa.plan.add-case'>
              <Icon.Icon icon='ph--plus--regular' size='md' />
              <span>Add case</span>
            </Button.Root>
          </div>
          {cases.length === 0 ? (
            <p className='text-fg-subtle' data-testid='qa.plan.no-cases'>
              No cases yet.
            </p>
          ) : (
            <ul data-testid='qa.plan.cases'>
              {cases.map((testCase) => (
                <li key={testCase.id} className='flex gap-2 py-1'>
                  <span className='font-mono text-sm w-20 shrink-0'>{testCase.key}</span>
                  <span className='grow'>{testCase.title}</span>
                  <span className='text-fg-subtle text-sm'>{testCase.steps.length} steps</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <Field.Label>Runs</Field.Label>
          {newestFirst.length === 0 ? (
            <p className='text-fg-subtle' data-testid='qa.plan.no-runs'>
              No runs yet.
            </p>
          ) : (
            <ul data-testid='qa.plan.runs'>
              {newestFirst.map((run) => (
                <li key={run.id} data-testid='qa.plan.run'>
                  <RunRow
                    run={run}
                    expanded={expanded === run.id}
                    onToggle={() => setExpanded((current) => (current === run.id ? undefined : run.id))}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </Panel.Body>
    </Panel.Root>
  );
};

TestPlanArticle.displayName = 'TestPlanArticle';

export default TestPlanArticle;
