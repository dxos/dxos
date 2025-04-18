//
// Copyright 2025 DXOS.org
//

import React, { useState, useMemo, useCallback } from 'react';

import { decodeReference } from '@dxos/echo-protocol';
import { FormatEnum } from '@dxos/echo-schema';
import { type ScriptType } from '@dxos/functions/types';
import { type Space } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/react-ui-theme';

import { ExceptionPanel } from './ExceptionPanel';
import { LogPanel } from './LogPanel';
import { RawDataPanel } from './RawDataPanel';
import { SpanSummary } from './SpanSummary';
import { useScriptNameResolver, useInvocationSpans } from './hooks';
import { formatDuration } from './utils';
import { PanelContainer, Placeholder } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

export type InvocationTracePanelProps = {
  space?: Space;
  script?: ScriptType;
  detailAxis?: 'block' | 'inline';
};

export const InvocationTracePanel = ({ detailAxis = 'inline', ...props }: InvocationTracePanelProps) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;

  const invocationSpans = useInvocationSpans({ space, script: props.script });

  const [selectedId, setSelectedId] = useState<string>();
  const selectedInvocation = useMemo(() => {
    if (!selectedId) {
      return undefined;
    }
    return invocationSpans.find((span) => selectedId === span.id);
  }, [selectedId, invocationSpans]);

  const resolver = useScriptNameResolver({ space });

  const invocationProperties: TablePropertyDefinition[] = useMemo(() => {
    function* generateProperties() {
      if (props.script === undefined) {
        yield { name: 'target', title: 'Target', format: FormatEnum.String, size: 200 };
      }

      //
      yield* [
        {
          name: 'time',
          title: 'Started',
          format: FormatEnum.DateTime,
          sort: 'desc' as const,
          size: 194,
        },
        {
          name: 'status',
          title: 'Status',
          format: FormatEnum.SingleSelect,
          size: 110,
          config: {
            options: [
              { id: 'pending', title: 'Pending', color: 'blue' },
              { id: 'success', title: 'Success', color: 'emerald' },
              { id: 'failure', title: 'Failure', color: 'red' },
              { id: 'unknown', title: 'Unknown', color: 'neutral' },
            ],
          },
        },
        { name: 'duration', title: 'Duration', format: FormatEnum.Duration, size: 110 },
        { name: 'queue', title: 'Queue', format: FormatEnum.String },
      ];
    }

    return [...generateProperties()];
  }, [props.script]);

  const invocationData = useMemo(() => {
    return invocationSpans.map((invocation) => {
      const status = invocation.outcome;
      const targetDxn = decodeReference(invocation.invocationTarget).dxn;

      // TODO(burdon): Use InvocationTraceStartEvent.
      return {
        id: invocation.id,
        target: resolver(targetDxn),
        time: new Date(invocation.timestampMs),
        status,
        duration: formatDuration(invocation.durationMs),
        queue: decodeReference(invocation.invocationTraceQueue).dxn?.toString() ?? 'unknown',
        _original: invocation,
      };
    });
  }, [invocationSpans, resolver]);

  const handleInvocationRowClicked = useCallback((row: any) => {
    if (!row) {
      return;
    }
    setSelectedId(row.id);
  }, []);

  const [activeTab, setActiveTab] = useState('logs');

  const gridLayout = useMemo(() => {
    if (selectedInvocation) {
      switch (detailAxis) {
        case 'inline':
          return 'grid grid-cols-[1fr_30rem]';
        case 'block':
          return 'grid grid-rows-[1fr_2fr]';
      }
    }

    return 'grid grid-cols-1';
  }, [selectedInvocation, detailAxis]);

  return (
    <PanelContainer
      toolbar={
        !props.space && (
          <Toolbar.Root classNames='border-be border-separator'>
            <DataSpaceSelector />
          </Toolbar.Root>
        )
      }
    >
      <div className={mx('bs-full', gridLayout)}>
        <DynamicTable
          properties={invocationProperties}
          data={invocationData}
          onRowClicked={handleInvocationRowClicked}
        />
        {selectedInvocation && (
          <div
            className={mx(
              'grid grid-cols-1 grid-rows-[min-content_1fr] bs-full min-bs-0 border-separator',
              detailAxis === 'inline' && 'border-is',
              detailAxis === 'block' && 'border-bs',
            )}
          >
            <SpanSummary span={selectedInvocation} space={space} onClose={() => setSelectedId(undefined)} />
            <Tabs.Root
              orientation='horizontal'
              value={activeTab}
              onValueChange={setActiveTab}
              classNames='grid grid-rows-[min-content_1fr] min-bs-0 [&>[role="tabpanel"]]:min-bs-0 [&>[role="tabpanel"][data-state="active"]]:grid border-bs border-separator'
            >
              <Tabs.Tablist classNames='border-be border-separator'>
                <Tabs.Tab value='logs'>Logs</Tabs.Tab>
                <Tabs.Tab value='exceptions'>Exceptions</Tabs.Tab>
                <Tabs.Tab value='raw'>Raw</Tabs.Tab>
              </Tabs.Tablist>
              <Tabs.Tabpanel value='logs'>
                <LogPanel span={selectedInvocation} />
              </Tabs.Tabpanel>
              <Tabs.Tabpanel value='exceptions'>
                {selectedInvocation ? (
                  <ExceptionPanel span={selectedInvocation} />
                ) : (
                  <Placeholder label='Select an invocation to see exceptions' />
                )}
              </Tabs.Tabpanel>
              <Tabs.Tabpanel value='raw' classNames='min-bs-0 min-is-0 is-full overflow-auto'>
                <div className='text-xs'>
                  {selectedInvocation ? <RawDataPanel span={selectedInvocation} /> : <Placeholder label='Contents' />}
                </div>
              </Tabs.Tabpanel>
            </Tabs.Root>
          </div>
        )}
      </div>
    </PanelContainer>
  );
};
