//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as Process from '@dxos/compute/Process';
import { Feed, Filter, Query, Ref, Scope } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { generateJmapDataset, jmapSyncTestServices, runJmapSync } from '@dxos/plugin-jmap/testing';
import { type Space, useQuery } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Message } from '@dxos/types';

/** Knobs the story passes as the cell's surface data. */
export type SyncRunsConfig = {
  /** Messages in the mock account. */
  count?: number;
  /** Wall-clock budget per run; EDGE uses 40s (`MailSync.MAIL_SYNC_TIME_BUDGET_MS`). */
  budgetMs?: number;
  /** Mock fetch delay per message, so runs spend time the way a live account does. */
  latencyMs?: number;
};

type RunStatus = 'running' | 'continues' | 'complete' | 'failed';

type Run = {
  index: number;
  startedMs: number;
  durationMs?: number;
  /** Feed messages added by this run. */
  added?: number;
  status: RunStatus;
  error?: string;
};

/** Stops a chain that never completes, rather than looping forever. */
const MAX_RUNS = 50;

const DAY_MS = 24 * 60 * 60 * 1_000;

/**
 * Drives the real mail sync chain against a mock JMAP account and lists each run: how long it took
 * against its budget, how many messages it added, and whether it continued via `Operation.runAgain()`.
 */
export const SyncRunsModule = ({ data }: { data?: SyncRunsConfig }) => {
  const space = Hooks.useActiveSpace();
  if (!space) {
    return null;
  }
  return <SyncRunsContainer space={space} {...data} />;
};

const SyncRunsContainer = ({
  space,
  count = 120,
  budgetMs = 4_000,
  latencyMs = 120,
}: SyncRunsConfig & { space: Space }) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const [connection] = useQuery(space.db, Filter.type(Connection.Connection));
  const dataset = useMemo(() => {
    const now = Date.now();
    return generateJmapDataset({ count, seed: 7, start: new Date(now - 20 * DAY_MS), end: new Date(now - DAY_MS) });
  }, [count]);

  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [now, setNow] = useState(() => performance.now());
  const fiberRef = useRef<Fiber.Fiber<void, never> | undefined>(undefined);
  const running = runs.some((run) => run.status === 'running');

  // Redraws the live run's bar; a browser timer, since it only paints.
  useEffect(() => {
    if (!running) {
      return;
    }
    const interval = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => () => void (fiberRef.current && Effect.runFork(Fiber.interrupt(fiberRef.current))), []);

  const countMessages = useCallback(
    () =>
      Effect.promise(async () => {
        const feed = await mailbox?.feed.tryLoad();
        const feedUri = feed && Feed.getFeedUri(feed);
        if (!feedUri) {
          return 0;
        }
        const messages = await space.db
          .query(Query.select(Filter.type(Message.Message)).from(Scope.feed(feedUri)))
          .run();
        return messages.length;
      }),
    [space.db, mailbox],
  );

  const handleSync = useCallback(() => {
    if (!connection || running) {
      return;
    }
    const update = (index: number, patch: Partial<Run>) =>
      setRuns((previous) => previous.map((run) => (run.index === index ? { ...run, ...patch } : run)));

    const chain = Effect.gen(function* () {
      setRuns([]);
      for (let index = 1; index <= MAX_RUNS; index++) {
        const before = yield* countMessages();
        const startedMs = performance.now();
        setRuns((previous) => [...previous, { index, startedMs, status: 'running' }]);

        const exit = yield* runJmapSync({ connection: Ref.make(connection), timeBudgetMs: budgetMs }).pipe(
          Effect.provide(jmapSyncTestServices(space.db, dataset, { latencyMs })),
          Effect.exit,
        );

        const after = yield* countMessages();
        setTotal(after);
        const continues = Exit.isFailure(exit) && Process.RunAgainError.is(Cause.squash(exit.cause));
        update(index, {
          durationMs: performance.now() - startedMs,
          added: after - before,
          status: Exit.isSuccess(exit) ? 'complete' : continues ? 'continues' : 'failed',
          error: Exit.isFailure(exit) && !continues ? String(Cause.squash(exit.cause)) : undefined,
        });
        if (!continues) {
          return;
        }
      }
    });
    fiberRef.current = Effect.runFork(chain);
  }, [connection, running, countMessages, budgetMs, space.db, dataset, latencyMs]);

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Sync runs</Toolbar.Text>
          <Toolbar.Separator />
          <Button.Root
            data-testid='sync-runs.sync'
            icon={running ? 'ph--spinner-gap--regular' : 'ph--arrows-clockwise--regular'}
            label='Sync'
            disabled={!connection || running}
            onClick={handleSync}
          />
          <Toolbar.Text classNames='text-fg-muted' data-testid='sync-runs.total'>
            {total} / {dataset.emails.length} messages
          </Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='flex flex-col gap-2 p-2 text-sm overflow-auto'>
        <p className='text-fg-muted'>
          Each run stops taking messages after {(budgetMs / 1_000).toFixed(0)}s (40s on EDGE, inside its 60s limit),
          saves its position, and the next run continues from there.
        </p>
        <ul className='flex flex-col gap-2' data-testid='sync-runs.list'>
          {runs.map((run) => (
            <RunRow key={run.index} run={run} budgetMs={budgetMs} now={now} />
          ))}
        </ul>
      </Panel.Body>
    </Panel.Root>
  );
};

const STATUS_LABEL: Record<RunStatus, string> = {
  running: 'running',
  continues: 'out of time → continues',
  complete: 'complete',
  failed: 'failed',
};

const STATUS_CLASS: Record<RunStatus, string> = {
  running: 'text-accent-text',
  continues: 'text-warning-text',
  complete: 'text-success-text',
  failed: 'text-error-text',
};

/** One run: a bar of elapsed time against the budget (the marker), what it added, and how it ended. */
const RunRow = ({ run, budgetMs, now }: { run: Run; budgetMs: number; now: number }) => {
  const elapsedMs = run.durationMs ?? now - run.startedMs;
  // The scale runs past the budget so the overrun after the cutoff (the final commit) stays visible.
  const scaleMs = budgetMs * 1.5;
  const fraction = Math.min(1, elapsedMs / scaleMs);
  return (
    <li className='grid grid-cols-[4rem_1fr_6rem] items-center gap-2' data-testid={`sync-runs.run-${run.index}`}>
      <span>Run {run.index}</span>
      <div className='relative h-3 rounded-sm bg-input-surface'>
        <div className='absolute inset-y-0 left-0 rounded-sm bg-accent-bg' style={{ width: `${fraction * 100}%` }} />
        <div
          className='absolute inset-y-[-2px] w-px bg-error-text'
          style={{ left: `${(budgetMs / scaleMs) * 100}%` }}
        />
      </div>
      <span className='text-end tabular-nums'>
        {(elapsedMs / 1_000).toFixed(1)}s{run.added !== undefined ? ` · +${run.added}` : ''}
      </span>
      <span />
      <span className={`text-xs ${STATUS_CLASS[run.status]}`} title={run.error}>
        {STATUS_LABEL[run.status]}
      </span>
    </li>
  );
};
