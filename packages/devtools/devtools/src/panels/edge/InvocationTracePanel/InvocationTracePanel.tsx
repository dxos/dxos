//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState, useMemo, useCallback } from 'react';

import { decodeReference } from '@dxos/echo-protocol';
import { FormatEnum } from '@dxos/echo-schema';
import {
  type TraceEvent,
  type InvocationTraceEvent,
  type InvocationSpan,
  createInvocationSpans,
} from '@dxos/functions/types';
import { useQueue, type Space } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import { ControlledSelector, PanelContainer, Placeholder } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';
import { styles } from '../../../styles';

export const InvocationTracePanel = (props: { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
  const invocationsQueue = useQueue<InvocationTraceEvent>(space?.properties.invocationTraceQueue?.dxn);
  const [selectedInvocation, setSelectedInvocation] = useState<InvocationSpan>();

  const traceQueueDxn = useMemo(() => {
    return selectedInvocation?.invocationTraceQueue
      ? decodeReference(selectedInvocation.invocationTraceQueue).dxn
      : undefined;
  }, [selectedInvocation?.invocationTraceQueue]);

  const eventQueue = useQueue<TraceEvent>(traceQueueDxn);

  const [selectedObject, setSelectedObject] = useState<any>();
  const invocationSpans = useMemo(
    () => createInvocationSpans(invocationsQueue?.items),
    [invocationsQueue?.items ?? []],
  );
  const invocationsByTarget = groupByInvocationTarget(invocationSpans);
  const [selectedTarget, setSelectedTarget] = useState<string>();

  useEffect(() => {
    if (selectedTarget && !invocationsByTarget.has(selectedTarget)) {
      setSelectedTarget(undefined);
    } else if (!selectedTarget && invocationsByTarget.size) {
      setSelectedTarget([...invocationsByTarget.keys()][0]);
    }
  }, [invocationsByTarget ?? null]);

  const invocationProperties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'time', title: 'Time', format: FormatEnum.String, sort: 'desc' as const },
      { name: 'outcome', title: 'Outcome', format: FormatEnum.String, size: 140 },
      { name: 'queue', title: 'Queue', format: FormatEnum.String },
    ],
    [],
  );

  const invocationData = useMemo(() => {
    return filterBySelected(invocationSpans, selectedTarget).map((item) => ({
      id: `${item.timestampMs}-${Math.random()}`,
      time: new Date(item.timestampMs).toLocaleString(),
      outcome: item.outcome,
      queue: decodeReference(item.invocationTraceQueue).dxn?.toString() ?? 'unknown',
      _original: item,
    }));
  }, [invocationsQueue?.items, selectedTarget]);
  const handleInvocationRowClicked = useCallback((row: any) => {
    if (!row) {
      return;
    }
    const invocation = row._original;
    setSelectedInvocation(invocation);
    setSelectedObject(invocation);
  }, []);

  const traceEventProperties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'time', title: 'Time', format: FormatEnum.String, sort: 'desc' as const },
      { name: 'outcome', title: 'Outcome', format: FormatEnum.String, size: 140 },
      { name: 'unhandled', title: 'Unhandled', format: FormatEnum.Number, size: 140 },
      { name: 'logs', title: 'Logs', format: FormatEnum.Number, size: 115 },
    ],
    [],
  );

  const traceEventData = useMemo(() => {
    return (eventQueue?.items ?? []).map((item) => ({
      id: `${item.ingestionTimestampMs}-${Math.random()}`,
      time: new Date(item.ingestionTimestampMs).toLocaleString(),
      outcome: item.outcome,
      unhandled: item.exceptions.length,
      logs: item.logs.length,
      _original: item,
    }));
  }, [eventQueue?.items]);

  const handleEventRowClicked = (row: any) => {
    if (!row) {
      return;
    }
    setSelectedObject(row._original);
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          {!props.space && <DataSpaceSelector />}
          <ControlledSelector
            placeholder={'Invocation target'}
            values={[...invocationsByTarget.keys()]}
            value={selectedTarget ?? ''}
            setValue={setSelectedTarget}
          />
        </Toolbar.Root>
      }
    >
      <div className={mx('flex grow flex-col divide-y', 'overflow-hidden', styles.border)}>
        <div className={mx('flex overflow-auto', 'h-1/4')}>
          <DynamicTable
            properties={invocationProperties}
            data={invocationData}
            onRowClicked={handleInvocationRowClicked}
          />
        </div>

        <div className={mx('flex overflow-auto', 'h-1/4')}>
          {eventQueue ? (
            <DynamicTable
              properties={traceEventProperties}
              data={traceEventData}
              onRowClicked={handleEventRowClicked}
            />
          ) : (
            <Placeholder label='Events' />
          )}
        </div>

        <div className={mx('flex overflow-auto', 'h-1/2')}>
          {selectedObject ? <ObjectDataViewer object={selectedObject} /> : <Placeholder label='Contents' />}
        </div>
      </div>
    </PanelContainer>
  );
};

export type ObjectDataViewerProps = {
  object: any;
};

const ObjectDataViewer = ({ object }: ObjectDataViewerProps) => {
  const text = JSON.stringify(object, null, 2);

  const rowRenderer = ({
    rows,
    stylesheet,
    useInlineStyles,
  }: {
    rows: rendererNode[];
    stylesheet: any;
    useInlineStyles: any;
  }) => {
    return rows.map((row, index) => {
      return createElement({
        node: row,
        stylesheet,
        style: {},
        useInlineStyles,
        key: index,
      });
    });
  };

  return (
    <SyntaxHighlighter language='json' renderer={rowRenderer}>
      {text}
    </SyntaxHighlighter>
  );
};

const filterBySelected = (items: InvocationSpan[], target: string | undefined) => {
  if (!target) {
    return [];
  }
  return items.filter((item) => decodeReference(item.invocationTarget).dxn?.toString() === target);
};

const groupByInvocationTarget = (items: InvocationSpan[]): Map<string, InvocationSpan[]> => {
  const result = new Map<string, InvocationSpan[]>();
  for (const item of items) {
    const key = decodeReference(item.invocationTarget).dxn?.toString();
    if (key) {
      const list = result.get(key) ?? [];
      result.set(key, list);
      list.push(item);
    }
  }
  return result;
};

interface rendererNode {
  type: 'element' | 'text';
  value?: string | number | undefined;
  tagName?: keyof React.JSX.IntrinsicElements | React.ComponentType<any> | undefined;
  properties?: { className: any[]; [key: string]: any };
  children?: rendererNode[];
}
