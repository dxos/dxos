//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { createEffect, createSignal, onCleanup } from 'solid-js';

import { type Database, Filter, Obj } from '@dxos/echo';
import { type Queue, type QueueAPI } from '@dxos/echo-db';
import { Function, getUserFunctionIdInMetadata } from '@dxos/functions';
import {
  InvocationOutcome,
  type InvocationSpan,
  InvocationTraceEndEvent,
  type InvocationTraceEvent,
  InvocationTraceStartEvent,
  createInvocationSpans,
} from '@dxos/functions-runtime';
import { type DXN } from '@dxos/keys';

import { type Column, Table } from '../../../../../components/Table';
import { theme } from '../../../../../theme';

export type TraceProps = {
  db: Database.Database;
  queues: QueueAPI;
  queueDxn: Option.Option<DXN>;
  functionId: Option.Option<string>;
};

export const Trace = (props: TraceProps) => {
  const [invocations, setInvocations] = createSignal<InvocationSpan[]>([]);
  const [selectedInvocation, setSelectedInvocation] = createSignal<InvocationSpan | undefined>();
  const [traceQueue, setTraceQueue] = createSignal<Queue<InvocationTraceEvent> | undefined>();
  const [functions, setFunctions] = createSignal<Function.Function[]>([]);

  // Set up effects.
  useFunctionQuery(props.db, setFunctions);
  useTraceQueue(props.queueDxn, props.queues, setTraceQueue);
  useInvocationsSubscription(traceQueue, props.functionId, setInvocations, selectedInvocation, setSelectedInvocation);

  // Function name resolver (needs access to functions signal).
  const getFunctionName = (invocationTarget: DXN | undefined): string | undefined => {
    if (!invocationTarget) {
      return undefined;
    }
    const uuidPart = getUuidFromDxn(invocationTarget);
    if (!uuidPart) {
      return undefined;
    }
    return functions().find((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn)) === uuidPart)?.name;
  };

  // Target display name (uses getFunctionName).
  const getTargetDisplayName = (span: InvocationSpan): string => {
    const targetDxn = span.invocationTarget?.dxn;
    const name = getFunctionName(targetDxn);
    return name ?? targetDxn?.toString().split(':').pop() ?? '?';
  };

  const columns: Column<InvocationSpan>[] = [
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
          setSelectedInvocation(row);
        }}
        selectedId={selectedInvocation()?.id}
        getId={(row) => row.id}
        theme={theme}
      />
      <box height='50%' flexDirection='column' padding={1}>
        {selectedInvocation() ? (
          <>
            <box height={1}>
              <text>Invocation Details: {selectedInvocation()?.id}</text>
            </box>
            <box height={1}>
              <text>Target: {getTargetDisplayName(selectedInvocation()!)}</text>
            </box>
            <box height={1}>
              <text>Status: {selectedInvocation()?.outcome}</text>
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
                <text>{selectedInvocation()?.error?.message}</text>
                <text>{selectedInvocation()?.error?.stack}</text>
              </box>
            )}
          </>
        ) : (
          <box height={1}>
            <text>Select an invocation to view details.</text>
          </box>
        )}
      </box>
    </box>
  );
};

// Helper: Extracts the UUID part from a DXN.
const getUuidFromDxn = (dxn: DXN | string | undefined): string | undefined => {
  if (!dxn) {
    return undefined;
  }
  const dxnString = dxn.toString();
  const dxnParts = dxnString.split(':');
  return dxnParts.at(-1);
};

// Helper: Format timestamp as time string.
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
};

// Helper: Format invocation outcome as status string.
const formatStatus = (outcome?: InvocationOutcome): string => {
  if (outcome === InvocationOutcome.SUCCESS) return 'OK';
  if (outcome === InvocationOutcome.FAILURE) return 'ERR';
  return outcome ?? 'UNKNOWN';
};

// Effect: Query for Function objects to resolve target names.
const useFunctionQuery = (db: Database.Database, setFunctions: (functions: Function.Function[]) => void) => {
  createEffect(() => {
    const functionsQuery = db.query(Filter.type(Function.Function));
    const update = () => {
      setFunctions(functionsQuery.results as Function.Function[]);
    };
    const unsubscribe = functionsQuery.subscribe(update, { fire: true });
    onCleanup(() => unsubscribe());
  });
};

// Effect: Resolve the queue from the DXN.
const useTraceQueue = (
  queueDxn: Option.Option<DXN>,
  queues: QueueAPI,
  setTraceQueue: (queue: Queue<InvocationTraceEvent> | undefined) => void,
) => {
  createEffect(() => {
    if (Option.isNone(queueDxn)) {
      setTraceQueue(undefined);
      return;
    }

    try {
      const queue = queues.get<InvocationTraceEvent>(queueDxn.value);
      setTraceQueue(queue);
      // Initial refresh to load current state.
      void queue.refresh();
    } catch {
      setTraceQueue(undefined);
    }
  });
};

// Effect: Subscribe to invocations and poll the queue for updates.
const useInvocationsSubscription = (
  traceQueue: () => Queue<InvocationTraceEvent> | undefined,
  functionId: Option.Option<string>,
  setInvocations: (invocations: InvocationSpan[]) => void,
  selectedInvocation: () => InvocationSpan | undefined,
  setSelectedInvocation: (invocation: InvocationSpan | undefined) => void,
) => {
  createEffect(() => {
    const queue = traceQueue();
    if (!queue) {
      setInvocations([]);
      return;
    }

    // Poll interval in milliseconds (1 second, matching useQueue default).
    const POLL_INTERVAL = 1000;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    // Poll the queue to pick up new events.
    const poll = () => {
      void queue.refresh().finally(() => {
        timeout = setTimeout(poll, POLL_INTERVAL);
      });
    };

    // Start polling.
    poll();

    // Query both start and end events from the trace queue.
    const query = queue.query(Filter.or(Filter.type(InvocationTraceStartEvent), Filter.type(InvocationTraceEndEvent)));

    const update = async () => {
      // Use run() to get all events, not just cached results.
      const events = (await query.run()) as InvocationTraceEvent[];
      let spans = createInvocationSpans(events);

      // Filter by function ID if provided.
      if (Option.isSome(functionId)) {
        const targetId = functionId.value;
        spans = spans.filter((span) => span.invocationTarget?.toString().includes(targetId));
      }

      // Sort by time descending (newest first).
      spans.sort((a, b) => b.timestamp - a.timestamp);

      setInvocations(spans);

      // Auto-select first item if no selection exists.
      if (spans.length > 0 && !selectedInvocation()) {
        setSelectedInvocation(spans[0]);
      }
    };

    // Initial load of all events.
    void update();

    const unsubscribe = query.subscribe(() => {
      void update();
    });

    onCleanup(() => {
      if (timeout) {
        clearTimeout(timeout);
      }
      unsubscribe();
    });
  });
};
