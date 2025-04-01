//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type Queue } from '@dxos/echo-db';
import { decodeReference } from '@dxos/echo-protocol';
import { type TraceEvent, type InvocationTraceEvent } from '@dxos/functions/types';
import { type Space } from '@dxos/react-client/echo';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import { createColumnBuilder, Table, type TableColumnDef } from '@dxos/react-ui-table/deprecated';
import { mx } from '@dxos/react-ui-theme';

import { ControlledSelector, PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';
import { styles } from '../../../styles';

const invocationBuilder = createColumnBuilder<InvocationTraceEvent>();
const invocationsColumns: TableColumnDef<InvocationTraceEvent, any>[] = [
  invocationBuilder.helper.accessor((item) => new Date(item.timestampMs).toISOString(), {
    id: 'time',
    ...invocationBuilder.builder.string(),
    size: 120,
  }),
  invocationBuilder.helper.accessor((item) => item.outcome, {
    id: 'outcome',
    ...invocationBuilder.builder.string(),
    minSize: 40,
    size: 40,
  }),
  invocationBuilder.helper.accessor((item) => decodeReference(item.invocationTraceQueue).dxn?.toString() ?? 'unknown', {
    id: 'queue',
    ...invocationBuilder.builder.string(),
  }),
];

const traceEventBuilder = createColumnBuilder<TraceEvent>();
const traceEventColumns: TableColumnDef<TraceEvent, any>[] = [
  traceEventBuilder.helper.accessor((item) => new Date(item.ingestionTimestampMs).toISOString(), {
    id: 'time',
    ...traceEventBuilder.builder.string(),
    size: 120,
  }),
  traceEventBuilder.helper.accessor((item) => item.outcome, {
    id: 'outcome',
    ...traceEventBuilder.builder.string(),
    minSize: 40,
    size: 40,
  }),
  traceEventBuilder.helper.accessor((item) => item.exceptions.length, {
    id: 'unhandled',
    ...traceEventBuilder.builder.number(),
    size: 40,
  }),
  traceEventBuilder.helper.accessor((item) => item.logs.length, {
    id: 'logs',
    ...traceEventBuilder.builder.number(),
    size: 40,
  }),
];

export const InvocationTracePanel = (props: { space?: Space }) => {
  const edgeClient = useEdgeClient();
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
  const invocationsQueue = useQueue<InvocationTraceEvent>(edgeClient, space?.properties.invocationTraceQueue?.dxn);
  const [selectedInvocation, setSelectedInvocation] = useState<InvocationTraceEvent>();
  const eventQueue = useQueue<TraceEvent>(
    edgeClient,
    selectedInvocation?.invocationTraceQueue && decodeReference(selectedInvocation?.invocationTraceQueue).dxn,
  );
  const [selectedObject, setSelectedObject] = useState<any>();
  const invocationsByTarget = groupByInvocationTarget(invocationsQueue);
  const [selectedTarget, setSelectedTarget] = useState<string>();

  useEffect(() => {
    if (selectedTarget && !invocationsByTarget.has(selectedTarget)) {
      setSelectedTarget(undefined);
    } else if (!selectedTarget && invocationsByTarget.size) {
      setSelectedTarget([...invocationsByTarget.keys()][0]);
    }
  }, [invocationsByTarget ?? null]);

  const selectTraceEvent = (invocation: InvocationTraceEvent) => {
    setSelectedInvocation(invocation);
    setSelectedObject(invocation);
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
      <div className={mx('flex grow', 'flex-col divide-y', 'overflow-hidden', styles.border)}>
        <div className={mx('flex overflow-auto', 'h-1/4')}>
          <Table.Root>
            <Table.Viewport asChild>
              <div className='flex-col divide-y'>
                <Table.Main<InvocationTraceEvent>
                  columns={invocationsColumns}
                  data={filterBySelected(invocationsQueue?.items ?? [], selectedTarget)}
                  rowsSelectable
                  currentDatum={selectedInvocation}
                  onDatumClick={selectTraceEvent}
                  fullWidth
                />
              </div>
            </Table.Viewport>
          </Table.Root>
        </div>

        <div className={mx('flex overflow-auto', 'h-1/4')}>
          {eventQueue ? (
            <>
              <Table.Root>
                <Table.Viewport asChild>
                  <div className='flex-col divide-y'>
                    <Table.Main<TraceEvent>
                      columns={traceEventColumns}
                      data={eventQueue.items}
                      rowsSelectable
                      currentDatum={selectedObject}
                      onDatumClick={setSelectedObject}
                      fullWidth
                    />
                  </div>
                </Table.Viewport>
              </Table.Root>
            </>
          ) : (
            'Select an invocation to see events.'
          )}
        </div>

        <div className={mx('flex overflow-auto', 'h-1/2')}>
          {selectedObject ? <ObjectDataViewer object={selectedObject} /> : 'Select an event to see contents'}
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

const filterBySelected = (items: InvocationTraceEvent[], target: string | undefined) => {
  if (!target) {
    return [];
  }
  return items.filter((item) => decodeReference(item.invocationTarget).dxn?.toString() === target);
};

const groupByInvocationTarget = (queue?: Queue<InvocationTraceEvent>): Map<string, InvocationTraceEvent[]> => {
  if (!queue) {
    return new Map();
  }
  const result = new Map<string, InvocationTraceEvent[]>();
  for (const item of queue.items) {
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
