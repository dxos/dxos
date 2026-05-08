//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { createEffect, createSignal, onCleanup } from 'solid-js';

import { Operation, Trace as TraceModule } from '@dxos/compute';
import { type Database, Filter, Query } from '@dxos/echo';
import { FeedTraceSink } from '@dxos/functions-runtime';

import { type Column, Table } from '../../../../components';
import { theme } from '../../../../theme';

type Span = {
  pid: string;
  timestamp: number;
  duration: number;
  outcome?: TraceModule.OperationOutcome;
  key?: string;
  name?: string;
  input?: unknown;
  runtime?: TraceModule.PayloadType<typeof TraceModule.OperationStart>['runtime'];
  error?: string;
};

const buildSpans = (messages: readonly TraceModule.Message[]): Span[] => {
  type Entry = {
    start?: { timestamp: number; data: TraceModule.PayloadType<typeof TraceModule.OperationStart> };
    end?: { timestamp: number; data: TraceModule.PayloadType<typeof TraceModule.OperationEnd> };
  };
  const byPid = new Map<string, Entry>();
  for (const message of messages) {
    const pid = message.meta.pid;
    if (!pid) {
      continue;
    }
    const entry = byPid.get(pid) ?? {};
    for (const event of message.events) {
      if (TraceModule.isOfType(TraceModule.OperationStart, event)) {
        entry.start = { timestamp: event.timestamp, data: event.data };
      } else if (TraceModule.isOfType(TraceModule.OperationEnd, event)) {
        entry.end = { timestamp: event.timestamp, data: event.data };
      }
    }
    byPid.set(pid, entry);
  }
  const now = Date.now();
  const spans: Span[] = [];
  for (const [pid, { start, end }] of byPid.entries()) {
    if (!start) {
      continue;
    }
    spans.push({
      pid,
      timestamp: start.timestamp,
      duration: end ? end.timestamp - start.timestamp : now - start.timestamp,
      outcome: end?.data.outcome,
      key: start.data.key,
      name: start.data.name ?? end?.data.name,
      input: start.data.input,
      runtime: start.data.runtime,
      error: end?.data.error,
    });
  }
  return spans;
};

export type TraceProps = {
  db: Database.Database;
  functionId: Option.Option<string>;
};

export const Trace = (props: TraceProps) => {
  const [invocations, setInvocations] = createSignal<Span[]>([]);
  const [selectedInvocationPid, setSelectedInvocationPid] = createSignal<string | undefined>();
  const [functions, setFunctions] = createSignal<Operation.PersistentOperation[]>([]);

  // Set up effects.
  useFunctionQuery(props.db, setFunctions);
  useInvocationsSubscription(
    props.db,
    props.functionId,
    setInvocations,
    selectedInvocationPid,
    setSelectedInvocationPid,
  );

  // Resolve selected invocation by pid against the current span list so updates are not stale.
  const selectedInvocation = (): Span | undefined => {
    const pid = selectedInvocationPid();
    if (!pid) {
      return undefined;
    }
    return invocations().find((span) => span.pid === pid);
  };

  const getTargetDisplayName = (span: Span): string => {
    if (span.name) {
      return span.name;
    }
    const matchingFunction = functions().find((fn) => fn.key === span.key);
    return matchingFunction?.name ?? span.key ?? span.pid;
  };

  const columns: Column<Span>[] = [
    {
      header: 'Target',
      width: 40,
      render: getTargetDisplayName,
    },
    {
      header: 'Started',
      width: 22,
      render: (r) => formatTime(r.timestamp),
    },
    {
      header: 'Status',
      width: 10,
      render: (r) => formatStatus(r.outcome),
    },
    {
      header: 'Runtime',
      width: 22,
      render: (r) => r.runtime ?? '-',
    },
    {
      header: 'Duration',
      width: 10,
      render: (r) => (r.duration ? `${r.duration}ms` : '-'),
    },
  ];

  return (
    <box flexDirection='column' height='100%'>
      <Table
        columns={columns}
        data={invocations()}
        onRowClick={(row) => {
          setSelectedInvocationPid(row.pid);
        }}
        selectedId={selectedInvocationPid()}
        getId={(row) => row.pid}
        theme={theme}
      />
      <box height='50%' flexDirection='column' padding={1}>
        {selectedInvocation() ? (
          <>
            <box height={1}>
              <text>Invocation Details: {selectedInvocation()?.pid}</text>
            </box>
            <box height={1}>
              <text>Target: {getTargetDisplayName(selectedInvocation()!)}</text>
            </box>
            <box height={1}>
              <text>Status: {selectedInvocation()?.outcome ?? 'pending'}</text>
            </box>
            <box marginTop={1} flexDirection='column'>
              <box height={1}>
                <text>Input:</text>
              </box>
              <text>{JSON.stringify(selectedInvocation()?.input, null, 2)}</text>
            </box>
            {selectedInvocation()?.error && (
              <box marginTop={1} flexDirection='column'>
                <box height={1}>
                  <text>Error:</text>
                </box>
                <text>{selectedInvocation()?.error}</text>
              </box>
            )}
          </>
        ) : (
          <box height={1} borderStyle='single' border={['top']}>
            <text>Select an invocation to view details.</text>
          </box>
        )}
      </box>
    </box>
  );
};

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
};

const formatStatus = (outcome: TraceModule.OperationOutcome | undefined): string => {
  switch (outcome) {
    case 'success':
      return 'OK';
    case 'failure':
      return 'ERR';
    default:
      return 'PEND';
  }
};

const useFunctionQuery = (
  db: Database.Database,
  setFunctions: (functions: Operation.PersistentOperation[]) => void,
) => {
  createEffect(() => {
    const functionsQuery = db.query(Filter.type(Operation.PersistentOperation));
    const update = () => {
      setFunctions(functionsQuery.results as Operation.PersistentOperation[]);
    };
    const unsubscribe = functionsQuery.subscribe(update, { fire: true });
    onCleanup(() => unsubscribe());
  });
};

/**
 * Subscribe to the per-space trace feed and fold `Trace.Message`s into invocation spans.
 */
const useInvocationsSubscription = (
  db: Database.Database,
  functionId: Option.Option<string>,
  setInvocations: (invocations: Span[]) => void,
  selectedInvocationPid: () => string | undefined,
  setSelectedInvocationPid: (pid: string | undefined) => void,
) => {
  createEffect(() => {
    const feedQuery = db.query(FeedTraceSink.query);

    let messageQuery: ReturnType<Database.Database['query']> | undefined;
    let messageUnsubscribe: (() => void) | undefined;

    const subscribeToMessages = () => {
      messageUnsubscribe?.();
      const feed = feedQuery.results[0];
      if (!feed) {
        setInvocations([]);
        return;
      }
      messageQuery = db.query(Query.type(TraceModule.Message).from(feed));
      const update = async () => {
        const messages = (await messageQuery!.run()) as TraceModule.Message[];
        let spans = buildSpans(messages);

        if (Option.isSome(functionId)) {
          const target = functionId.value;
          spans = spans.filter((span) => span.key === target);
        }

        spans.sort((a, b) => b.timestamp - a.timestamp);
        setInvocations(spans);

        if (spans.length > 0 && !selectedInvocationPid()) {
          setSelectedInvocationPid(spans[0].pid);
        }
      };
      messageUnsubscribe = messageQuery.subscribe(
        () => {
          void update();
        },
        { fire: true },
      );
    };

    const feedUnsubscribe = feedQuery.subscribe(subscribeToMessages, { fire: true });

    onCleanup(() => {
      messageUnsubscribe?.();
      feedUnsubscribe();
    });
  });
};
