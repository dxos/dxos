//
// Copyright 2023 DXOS.org
//

import * as Tabs from '@radix-ui/react-tabs';
import React, { useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { type Span } from '@dxos/protocols/proto/dxos/tracing';
import { useClient } from '@dxos/react-client';
import { AnchoredOverflow } from '@dxos/react-ui'; // Deliberately not using the common components export to aid in code-splitting.
import { createColumnBuilder, Table, type TableColumnDef, textPadding } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import { LogTable } from './LogTable';
import { MetricsView } from './MetricsView';
import { ResourceName } from './Resource';
import { TraceView } from './TraceView';
import { type ResourceState, type State } from './types';
import { PanelContainer } from '../../../components';

const { helper } = createColumnBuilder<ResourceState>();
const columns: TableColumnDef<ResourceState, any>[] = [
  helper.accessor('resource', {
    id: 'name',
    size: 200,
    meta: { cell: { classNames: textPadding } },
    cell: (cell) => <ResourceName resource={cell.getValue()} />,
  }),
  helper.accessor((state) => state.logs.length, {
    id: 'logs',
    size: 50,
    meta: { cell: { classNames: textPadding } },
  }),
  helper.accessor((state) => state.spans.length, {
    id: 'spans',
    size: 50,
    meta: { cell: { classNames: textPadding } },
  }),
  helper.accessor((state) => state.resource.info, {
    id: 'info',
    meta: { cell: { classNames: textPadding } },
    cell: (cell) => <div className='font-mono text-green-500'>{JSON.stringify(cell.getValue())}</div>,
  }),
];

export const TracingPanel = () => {
  const client = useClient();

  // Store state as ref to avoid re-building on state change.
  const [, forceUpdate] = useState({});
  const state = useRef<State>({
    resources: new Map<number, ResourceState>(),
    spans: new Map<number, Span>(),
  });

  const [selectedResourceId, setSelectedResourceId] = useState<number>();
  const selectedResource: ResourceState | undefined =
    selectedResourceId !== undefined ? state.current.resources.get(selectedResourceId) : undefined;

  useEffect(() => {
    const stream = client.services.services.TracingService!.streamTrace();
    stream.subscribe(
      (data) => {
        for (const event of data.resourceAdded ?? []) {
          const existing = state.current.resources.get(event.resource.id);
          if (!existing) {
            state.current.resources.set(event.resource.id, { resource: event.resource, spans: [], logs: [] });
          } else {
            existing.resource = event.resource;
          }
        }

        for (const event of data.resourceRemoved ?? []) {
          state.current.resources.delete(event.id);
        }

        for (const event of data.spanAdded ?? []) {
          state.current.spans.set(event.span.id, event.span);
          if (event.span.parentId === undefined) {
            const resource = state.current.resources.get(event.span.resourceId!);
            if (resource) {
              resource.spans.push(event.span);
            }
          }
        }

        for (const event of data.logAdded ?? []) {
          const resource = state.current.resources.get(event.log.meta!.resourceId!);
          if (!resource) {
            continue;
          }
          resource.logs.push(event.log);
        }

        forceUpdate({});
      },
      (err) => {
        log.catch(err);
      },
    );

    return () => {
      void stream.close();
    };
  }, []);

  const tabClass = mx(
    'radix-state-active:border-b-gray-700 focus-visible:radix-state-active:border-b-transparent radix-state-inactive:bg-gray-50 dark:radix-state-active:border-b-gray-100 dark:radix-state-active:bg-gray-500 focus-visible:dark:radix-state-active:border-b-transparent dark:radix-state-inactive:bg-gray-800',
    'flex-1 px-3 py-2.5',
    'first:rounded-tl-lg last:rounded-tr-lg',
    'border-b first:border-r last:border-l',
  );

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <PanelContainer>
      <Table.Root>
        <Table.Viewport classNames={'overflow-anchored flex flex-col h-1/3 overflow-auto'}>
          <Table.Main<ResourceState>
            columns={columns}
            data={Array.from(state.current.resources.values())}
            currentDatum={selectedResource}
            onDatumClick={(resourceState) => setSelectedResourceId(resourceState.resource.id)}
            fullWidth
          />
          <AnchoredOverflow.Anchor />
        </Table.Viewport>
      </Table.Root>

      <div className='flex flex-col h-2/3 overflow-hidden border-t'>
        <Tabs.Root defaultValue='details' className='flex flex-col grow overflow-hidden'>
          <Tabs.List className='flex'>
            <Tabs.Trigger className={tabClass} value='details'>
              Details
            </Tabs.Trigger>
            <Tabs.Trigger className={tabClass} value='logs'>
              Logs ({selectedResource?.logs.length ?? 0})
            </Tabs.Trigger>
            <Tabs.Trigger className={tabClass} value='spans'>
              Spans ({selectedResource?.spans.length ?? 0})
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value='details' className='grow overflow-auto'>
            <MetricsView resource={selectedResource?.resource} />
          </Tabs.Content>

          <Table.Root>
            <Table.Viewport asChild>
              <Tabs.Content ref={containerRef} value='logs' className='grow overflow-auto'>
                <LogTable logs={selectedResource?.logs ?? []} />
              </Tabs.Content>
            </Table.Viewport>
          </Table.Root>

          <Tabs.Content value='spans' className='grow overflow-hidden'>
            <TraceView state={state.current} resourceId={selectedResourceId} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </PanelContainer>
  );
};
